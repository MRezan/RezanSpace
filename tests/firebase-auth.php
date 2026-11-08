<?php
declare(strict_types=1);
require __DIR__.'/../backend/lib/firebase-auth.php';
use Firebase\JWT\JWT;
$tests=0;
function check(bool $value,string $label):void{global $tests;if(!$value)throw new RuntimeException($label);$tests++;}
function denied(callable $work,string $code='verification_failed'):void{try{$work();throw new RuntimeException('Accepted invalid proof');}catch(FirebaseAuthFailure $error){check($error->safeCode===$code,'Expected '.$code);}}
$key=openssl_pkey_new(['private_key_bits'=>2048,'private_key_type'=>OPENSSL_KEYTYPE_RSA]);openssl_pkey_export($key,$private);$public=openssl_pkey_get_details($key)['key'];$now=time();
$claims=['sub'=>'google-user','email'=>'reader@gmail.com','email_verified'=>true,'aud'=>REZAN_FIREBASE_PROJECT,'iss'=>'https://securetoken.google.com/'.REZAN_FIREBASE_PROJECT,'iat'=>$now,'exp'=>$now+3600,'auth_time'=>$now,'firebase'=>['sign_in_provider'=>'google.com']];
$token=fn(array $c)=>JWT::encode($c,$private,'RS256','test');
check(verifyGoogleFirebaseToken($token($claims),['test'=>$public],$now)['sub']==='google-user','Valid signed Google identity');
foreach(['aud'=>'other-project','iss'=>'https://attacker.invalid','email_verified'=>false,'exp'=>$now-1,'auth_time'=>$now-301,'sub'=>'','firebase'=>['sign_in_provider'=>'password'],'iat'=>$now+60] as $field=>$value){$bad=$claims;$bad[$field]=$value;denied(fn()=>verifyGoogleFirebaseToken($token($bad),['test'=>$public],$now));}
denied(fn()=>verifyGoogleFirebaseToken(JWT::encode($claims,str_repeat('s',32),'HS256','test'),['test'=>$public],$now));
denied(fn()=>verifyGoogleFirebaseToken($token($claims),['unknown'=>$public],$now));
$other=openssl_pkey_new(['private_key_bits'=>2048]);$wrong=openssl_pkey_get_details($other)['key'];denied(fn()=>verifyGoogleFirebaseToken($token($claims),['test'=>$wrong],$now));
// SQL fixtures exercise the actual query flow using SQLite's MySQL upsert adapter.
class TestStatement extends PDOStatement {
 protected function __construct(){}
}
class TestDatabase extends PDO {
 public function __construct(){parent::__construct('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);}
 public function prepare(string $query,array $options=[]):PDOStatement|false{
  $query=str_replace(' LIMIT 1 FOR UPDATE',' LIMIT 1',$query);
  $query=str_replace('ON DUPLICATE KEY UPDATE requested_at=VALUES(requested_at),expires_at=VALUES(expires_at)','ON CONFLICT(user_id) DO UPDATE SET requested_at=excluded.requested_at,expires_at=excluded.expires_at',$query);
  $query=str_replace('ON DUPLICATE KEY UPDATE firebase_uid=VALUES(firebase_uid)','ON CONFLICT(user_id) DO UPDATE SET firebase_uid=excluded.firebase_uid',$query);
  $query=str_replace('ON DUPLICATE KEY UPDATE valid_after=VALUES(valid_after)','ON CONFLICT(user_id) DO UPDATE SET valid_after=excluded.valid_after',$query);
  return parent::prepare($query,$options);
 }
}
$db=new TestDatabase();$db->exec('CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,email TEXT UNIQUE,password_hash TEXT,role TEXT DEFAULT "user");CREATE TABLE firebase_auth_links(user_id INTEGER PRIMARY KEY,firebase_uid TEXT UNIQUE,valid_after INTEGER DEFAULT 0);CREATE TABLE firebase_password_resets(user_id INTEGER PRIMARY KEY,requested_at INTEGER,expires_at INTEGER);CREATE TABLE user_sessions(user_id INTEGER,token_hash TEXT)');
$user=googleAccount($db,$claims);check((int)$user['id']===1,'New Google account');check($db->query('SELECT role FROM users')->fetchColumn()==='user','No Google admin elevation');
check((int)googleAccount($db,$claims)['id']===1,'Repeated sign-in retains account');
$pw=password_hash('original-password',PASSWORD_DEFAULT);$q=$db->prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)');$q->execute(['Existing','reader@example.org',$pw]);$third=$claims;$third['email']='reader@example.org';$third['sub']='other-uid';
denied(fn()=>googleAccount($db,$third),'link_required');denied(fn()=>googleAccount($db,$third,'wrong-password'),'link_required');check((int)googleAccount($db,$third,'original-password')['id']===2,'Third-party email requires local password');
$stolen=$claims;$stolen['email']='different@gmail.com';denied(fn()=>googleAccount($db,$stolen));
$requests=[];$send=function($method,$payload)use(&$requests){$requests[]=[$method,$payload];return [];};requestAccountReset($db,'unknown@example.org',$send);check(!$requests,'Unknown emails do not send or enroll');requestAccountReset($db,'reader@example.org',$send);check(count($requests)===2&&$requests[1][0]==='sendOobCode','Reset enrolls then sends');check($requests[0][1]['password']!=='original-password'&&strlen($requests[0][1]['password'])===64,'No existing password forwarded');
$db->exec('INSERT INTO user_sessions VALUES(2,"old-session")');$used=false;
$reset=function($method,$payload)use(&$used){if($used)throw new FirebaseAuthFailure('INVALID_OOB_CODE');if(isset($payload['newPassword']))$used=true;return ['email'=>'reader@example.org','requestType'=>'PASSWORD_RESET'];};
completeAccountReset($db,'single-use-test-code','new-strong-password',$reset,$now+1);
check(password_verify('new-strong-password',$db->query('SELECT password_hash FROM users WHERE id=2')->fetchColumn()),'Reset updates legacy hash');check((int)$db->query('SELECT COUNT(*) FROM user_sessions')->fetchColumn()===0,'Reset revokes old sessions');denied(fn()=>completeAccountReset($db,'single-use-test-code','newer-password',$reset),'INVALID_OOB_CODE');denied(fn()=>googleAccount($db,$third),'reauth_required');denied(fn()=>completeAccountReset($db,'single-use-test-code','short',$reset),'invalid_reset');
$passwordClaims=$claims;$passwordClaims['firebase']=['sign_in_provider'=>'password'];
check(verifyFirebaseIdentity($token($passwordClaims),'password',['test'=>$public],$now)['email']==='reader@gmail.com','Password recovery proof is verified');
denied(fn()=>verifyGoogleFirebaseToken($token($passwordClaims),['test'=>$public],$now));
$unverified=$passwordClaims;$unverified['email_verified']=false;denied(fn()=>verifyFirebaseIdentity($token($unverified),'password',['test'=>$public],$now));
$db->exec('INSERT INTO user_sessions VALUES(1,"old-google-session")');$q=$db->prepare('INSERT INTO firebase_password_resets VALUES(?,?,?)');$q->execute([1,$now-2,$now+60]);
check((int)finishHostedRecovery($db,$passwordClaims,'hosted-new-password',$now)['id']===1,'Hosted reset preserves legacy account');
check(password_verify('hosted-new-password',$db->query('SELECT password_hash FROM users WHERE id=1')->fetchColumn()),'Hosted reset syncs local password');
check((int)$db->query('SELECT COUNT(*) FROM user_sessions')->fetchColumn()===0,'Hosted reset revokes sessions');
denied(fn()=>finishHostedRecovery($db,$passwordClaims,'another-password',$now),'invalid_reset');
$q->execute([1,$now+1,$now+60]);denied(fn()=>finishHostedRecovery($db,$passwordClaims,'another-password',$now),'invalid_reset');
$db->exec('DELETE FROM firebase_password_resets WHERE user_id=1');$q->execute([1,$now-20,$now-1]);denied(fn()=>finishHostedRecovery($db,$passwordClaims,'another-password',$now),'invalid_reset');
echo "$tests Firebase security checks passed.\n";
