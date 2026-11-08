<?php
declare(strict_types=1);
require_once __DIR__.'/firebase-project.php';
require_once __DIR__.'/vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
final class FirebaseAuthFailure extends RuntimeException{
 public function __construct(public readonly string $safeCode,public readonly int $status=400){parent::__construct($safeCode);}
}
/** Fixed Google endpoints only; never log request bodies, tokens or responses. */
function firebaseHttp(string $url,?array $payload=null):array{
 if(!str_starts_with($url,'https://identitytoolkit.googleapis.com/v1/accounts:')&&$url!=='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')throw new FirebaseAuthFailure('service_unavailable',503);
 $body='';$ch=curl_init($url);
 curl_setopt_array($ch,[CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>15,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_HTTPHEADER=>['Content-Type: application/json'],CURLOPT_WRITEFUNCTION=>static function($curl,string $chunk)use(&$body):int{if(strlen($body)+strlen($chunk)>1000000)return 0;$body.=$chunk;return strlen($chunk);}]);
 if($payload!==null)curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($payload,JSON_THROW_ON_ERROR)]);
 $ok=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
 if($ok===false||$status>=500)throw new FirebaseAuthFailure('service_unavailable',503);
 try{$result=json_decode($body,true,32,JSON_THROW_ON_ERROR);}catch(JsonException){throw new FirebaseAuthFailure('service_unavailable',503);}
 if(!is_array($result))throw new FirebaseAuthFailure('service_unavailable',503);
 if($status<200||$status>=300){
  $code=explode(' : ',(string)($result['error']['message']??''))[0];
  $safe=in_array($code,['EMAIL_EXISTS','EMAIL_NOT_FOUND','INVALID_OOB_CODE','EXPIRED_OOB_CODE','TOO_MANY_ATTEMPTS_TRY_LATER','RESET_PASSWORD_EXCEED_LIMIT','OPERATION_NOT_ALLOWED','WEAK_PASSWORD'],true)?$code:'verification_failed';
  throw new FirebaseAuthFailure($safe,in_array($safe,['TOO_MANY_ATTEMPTS_TRY_LATER','RESET_PASSWORD_EXCEED_LIMIT'],true)?429:400);
 }
 return $result;
}
function firebaseRequest(string $method,array $payload):array{
 if(!in_array($method,['signUp','sendOobCode','resetPassword'],true))throw new FirebaseAuthFailure('service_unavailable',503);
 return firebaseHttp('https://identitytoolkit.googleapis.com/v1/accounts:'.$method.'?key='.rawurlencode(REZAN_FIREBASE_API_KEY),$payload);
}
/** JWT library handles RS256 signature and temporal checks; project/provider checks are mandatory. */
function verifyFirebaseIdentity(string $token,string $provider,?array $certificates=null,?int $now=null):array{
 if(!in_array($provider,['google.com','password'],true))throw new FirebaseAuthFailure('verification_failed',401);
 if(strlen($token)>16000||count(explode('.',$token))!==3)throw new FirebaseAuthFailure('verification_failed',401);
 $parts=explode('.',$token);
 try{$header=json_decode(JWT::urlsafeB64Decode($parts[0]),true,16,JSON_THROW_ON_ERROR);}catch(Throwable){throw new FirebaseAuthFailure('verification_failed',401);}
 if(!is_array($header)||($header['alg']??'')!=='RS256'||!is_string($header['kid']??null))throw new FirebaseAuthFailure('verification_failed',401);
 $certificates??=firebaseHttp('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
 $certificate=$certificates[$header['kid']]??null;
 if(!is_string($certificate))throw new FirebaseAuthFailure('verification_failed',401);
 $previous=JWT::$timestamp;$time=$now??time();
 try{if($now!==null)JWT::$timestamp=$now;$claims=(array)JWT::decode($token,new Key($certificate,'RS256'));}catch(Throwable){throw new FirebaseAuthFailure('verification_failed',401);}finally{JWT::$timestamp=$previous;}
 $firebase=(array)($claims['firebase']??[]);$subject=$claims['sub']??null;
 if(($claims['aud']??'')!==REZAN_FIREBASE_PROJECT||($claims['iss']??'')!=='https://securetoken.google.com/'.REZAN_FIREBASE_PROJECT||!is_string($subject)||$subject===''||strlen($subject)>128||($claims['email_verified']??false)!==true||($firebase['sign_in_provider']??'')!==$provider||isset($firebase['tenant'])||!filter_var($claims['email']??'',FILTER_VALIDATE_EMAIL)||!is_int($claims['exp']??null)||!is_int($claims['iat']??null)||!is_int($claims['auth_time']??null)||$claims['auth_time']>$time+30||$claims['auth_time']<$time-300)throw new FirebaseAuthFailure('verification_failed',401);
 return $claims;
}
function verifyGoogleFirebaseToken(string $token,?array $certificates=null,?int $now=null):array{return verifyFirebaseIdentity($token,'google.com',$certificates,$now);}
function ensureFirebaseAuthTables(PDO $pdo):void{
 $pdo->exec('CREATE TABLE IF NOT EXISTS firebase_auth_links (user_id BIGINT UNSIGNED PRIMARY KEY,firebase_uid VARCHAR(128) NULL UNIQUE,valid_after BIGINT UNSIGNED NOT NULL DEFAULT 0,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
 $pdo->exec('CREATE TABLE IF NOT EXISTS firebase_password_resets(user_id BIGINT UNSIGNED PRIMARY KEY,requested_at BIGINT UNSIGNED NOT NULL,expires_at BIGINT UNSIGNED NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
 $pdo->exec('CREATE TABLE IF NOT EXISTS auth_rate_limits (bucket CHAR(64) PRIMARY KEY,attempts INT UNSIGNED NOT NULL DEFAULT 1,expires_at BIGINT UNSIGNED NOT NULL,INDEX(expires_at)) ENGINE=InnoDB');
}
function authRateLimit(PDO $pdo,string $scope,int $limit,int $window=3600,?int $now=null):void{
 $now??=time();if(random_int(1,100)===1){$clean=$pdo->prepare('DELETE FROM auth_rate_limits WHERE expires_at<? LIMIT 1000');$clean->execute([$now]);}$bucket=hash('sha256',$scope.'|'.intdiv($now,$window));
 $q=$pdo->prepare('INSERT INTO auth_rate_limits(bucket,attempts,expires_at) VALUES(?,1,?) ON DUPLICATE KEY UPDATE attempts=attempts+1');$q->execute([$bucket,$now+$window]);
 $q=$pdo->prepare('SELECT attempts FROM auth_rate_limits WHERE bucket=?');$q->execute([$bucket]);
 if((int)$q->fetchColumn()>$limit)throw new FirebaseAuthFailure('rate_limited',429);
}
function googleAccount(PDO $pdo,array $claims,?string $existingPassword=null):array{
 $email=strtolower($claims['email']);$uid=$claims['sub'];
 $pdo->beginTransaction();
 try{
  $bound=$pdo->prepare('SELECT u.email FROM firebase_auth_links l JOIN users u ON u.id=l.user_id WHERE l.firebase_uid=? LIMIT 1 FOR UPDATE');$bound->execute([$uid]);$boundEmail=$bound->fetchColumn();
  if($boundEmail&&strtolower((string)$boundEmail)!==$email)throw new FirebaseAuthFailure('verification_failed',401);
  $q=$pdo->prepare('SELECT u.id,u.name,u.email,u.password_hash,l.firebase_uid,l.valid_after FROM users u LEFT JOIN firebase_auth_links l ON l.user_id=u.id WHERE u.email=? LIMIT 1 FOR UPDATE');$q->execute([$email]);$user=$q->fetch();
  if($user){
   if((int)($user['valid_after']??0)>(int)$claims['auth_time'])throw new FirebaseAuthFailure('reauth_required',401);
   $linked=($user['firebase_uid']??null)===$uid;
   $gmail=(bool)preg_match('/@(gmail|googlemail)\.com$/i',$email);
   // Google is authoritative for Gmail. Existing non-Google mailboxes require
   // the local password once; never merge merely because a client sent an email.
   if(!$linked&&((!empty($user['firebase_uid']))||!$gmail)&&($existingPassword===null||!password_verify($existingPassword,$user['password_hash'])))throw new FirebaseAuthFailure('link_required',409);
  }else{
   $name=mb_substr(trim(strip_tags((string)($claims['name']??''))),0,120);if(mb_strlen($name)<2)$name=mb_substr(strstr($email,'@',true),0,120);
   $q=$pdo->prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)');$q->execute([$name,$email,password_hash(bin2hex(random_bytes(32)),PASSWORD_DEFAULT)]);
   $user=['id'=>(int)$pdo->lastInsertId(),'name'=>$name,'email'=>$email];
  }
  $q=$pdo->prepare('INSERT INTO firebase_auth_links(user_id,firebase_uid) VALUES(?,?) ON DUPLICATE KEY UPDATE firebase_uid=VALUES(firebase_uid)');$q->execute([$user['id'],$uid]);
  $pdo->commit();return $user;
 }catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
}
function requestAccountReset(PDO $pdo,string $email,?callable $request=null):void{
 $request??='firebaseRequest';$q=$pdo->prepare('SELECT id FROM users WHERE email=? LIMIT 1');$q->execute([$email]);$id=$q->fetchColumn();if(!$id)return;
 // Existing PHP users are enrolled with an undisclosed random password solely
 // so Firebase can deliver its standard reset email. No hashes are exported.
 try{$request('signUp',['email'=>$email,'password'=>bin2hex(random_bytes(32)),'returnSecureToken'=>false]);}catch(FirebaseAuthFailure $error){if($error->safeCode!=='EMAIL_EXISTS')throw $error;}
 $request('sendOobCode',['requestType'=>'PASSWORD_RESET','email'=>$email,'continueUrl'=>REZAN_AUTH_ORIGIN.'/account/?recovery=complete']);
 $q=$pdo->prepare('INSERT INTO firebase_password_resets(user_id,requested_at,expires_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE requested_at=VALUES(requested_at),expires_at=VALUES(expires_at)');$q->execute([$id,time(),time()+86400]);
}
function completeAccountReset(PDO $pdo,string $code,string $password,?callable $request=null,?int $now=null):void{
 if(strlen($password)<8||strlen($password)>128||strlen($code)<10||strlen($code)>2048)throw new FirebaseAuthFailure('invalid_reset',422);
 $request??='firebaseRequest';$proof=$request('resetPassword',['oobCode'=>$code]);
 if(($proof['requestType']??'')!=='PASSWORD_RESET'||!filter_var($proof['email']??'',FILTER_VALIDATE_EMAIL))throw new FirebaseAuthFailure('invalid_reset',400);
 $email=strtolower($proof['email']);$q=$pdo->prepare('SELECT id FROM users WHERE email=? LIMIT 1');$q->execute([$email]);$id=$q->fetchColumn();if(!$id)throw new FirebaseAuthFailure('invalid_reset',400);
 // Google consumes this one-time code before local credentials are changed.
 $request('resetPassword',['oobCode'=>$code,'newPassword'=>$password]);
 $pdo->beginTransaction();
 try{
  $q=$pdo->prepare('UPDATE users SET password_hash=? WHERE id=?');$q->execute([password_hash($password,PASSWORD_DEFAULT),$id]);
  $q=$pdo->prepare('DELETE FROM user_sessions WHERE user_id=?');$q->execute([$id]);
  $q=$pdo->prepare('INSERT INTO firebase_auth_links(user_id,valid_after) VALUES(?,?) ON DUPLICATE KEY UPDATE valid_after=VALUES(valid_after)');$q->execute([$id,($now??time())+1]);
  $q=$pdo->prepare('DELETE FROM firebase_password_resets WHERE user_id=?');$q->execute([$id]);
  $pdo->commit();
 }catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
}

/** Complete the standard Firebase-hosted recovery without editing its email template. */
function finishHostedRecovery(PDO $pdo,array $claims,string $password,?int $now=null):array{
 $now??=time();if(strlen($password)<8||strlen($password)>128)throw new FirebaseAuthFailure('invalid_reset',422);
 $pdo->beginTransaction();
 try{
  $q=$pdo->prepare('SELECT u.id,u.name,u.email,r.requested_at,r.expires_at,l.firebase_uid FROM users u JOIN firebase_password_resets r ON r.user_id=u.id LEFT JOIN firebase_auth_links l ON l.user_id=u.id WHERE u.email=? LIMIT 1 FOR UPDATE');$q->execute([strtolower($claims['email'])]);$user=$q->fetch();
  if(!$user||(int)$user['expires_at']<=$now||(int)$claims['auth_time']<(int)$user['requested_at']||(!empty($user['firebase_uid'])&&$user['firebase_uid']!==$claims['sub']))throw new FirebaseAuthFailure('invalid_reset',400);
  $q=$pdo->prepare('UPDATE users SET password_hash=? WHERE id=?');$q->execute([password_hash($password,PASSWORD_DEFAULT),$user['id']]);
  $q=$pdo->prepare('DELETE FROM user_sessions WHERE user_id=?');$q->execute([$user['id']]);
  $q=$pdo->prepare('INSERT INTO firebase_auth_links(user_id,valid_after) VALUES(?,?) ON DUPLICATE KEY UPDATE valid_after=VALUES(valid_after)');$q->execute([$user['id'],$now+1]);
  $q=$pdo->prepare('DELETE FROM firebase_password_resets WHERE user_id=?');$q->execute([$user['id']]);$pdo->commit();return $user;
 }catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
}
