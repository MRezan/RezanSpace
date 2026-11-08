<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
require dirname(__DIR__).'/lib/firebase-auth.php';
require dirname(__DIR__).'/lib/auth-sessions.php';
header('Cache-Control: no-store');
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit(json_encode(['error'=>'Use POST.']));}
try{
 if(isset($_SERVER['HTTP_ORIGIN'])&&!in_array($_SERVER['HTTP_ORIGIN'],$allowedOrigins,true)&&$_SERVER['HTTP_ORIGIN']!==REZAN_AUTH_ORIGIN)throw new FirebaseAuthFailure('verification_failed',403);
 if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))throw new FirebaseAuthFailure('verification_failed',415);
 ensureFirebaseAuthTables($pdo);$data=input();$action=$_GET['action']??'';
 authRateLimit($pdo,'ip:'.$action.':'.($_SERVER['REMOTE_ADDR']??'unknown'),$action==='forgot'?20:60);
 if($action==='google'){
  $claims=verifyGoogleFirebaseToken((string)($data['id_token']??''));
  $user=googleAccount($pdo,$claims,isset($data['password'])?(string)$data['password']:null);
  exit(json_encode(issueSession($pdo,(int)$user['id'],$user['name'],$user['email'])));
 }
 if($action==='finish-recovery'){
  $claims=verifyFirebaseIdentity((string)($data['id_token']??''),'password');
  $user=finishHostedRecovery($pdo,$claims,(string)($data['password']??''));
  exit(json_encode(issueSession($pdo,(int)$user['id'],$user['name'],$user['email'])));
 }
 if($action==='forgot'){
  $email=strtolower(trim((string)($data['email']??'')));if(!filter_var($email,FILTER_VALIDATE_EMAIL))throw new FirebaseAuthFailure('invalid_email',422);
  authRateLimit($pdo,'reset-email:'.$email,3);requestAccountReset($pdo,$email);
  exit(json_encode(['ok'=>true,'message'=>'If an account uses this email, a password reset link will arrive shortly.']));
 }
 if($action==='reset'){
  completeAccountReset($pdo,(string)($data['code']??''),(string)($data['password']??''));
  exit(json_encode(['ok'=>true,'message'=>'Your password has been updated. Sign in with your new password.']));
 }
 throw new FirebaseAuthFailure('invalid_action',400);
}catch(FirebaseAuthFailure $error){
 $messages=['link_required'=>'This email already has a REZAN account. Enter its password once to connect Google securely.','reauth_required'=>'Please restart Google sign-in to verify your account again.','rate_limited'=>'Too many attempts. Please try again later.','invalid_email'=>'Enter a valid email address.','service_unavailable'=>'Sign-in service is temporarily unavailable. Please try again.'];
 http_response_code($error->status);echo json_encode(['error'=>$messages[$error->safeCode]??'This sign-in or reset link could not be verified. Please try again or request a new link.','code'=>$error->safeCode]);
}catch(Throwable){http_response_code(503);echo json_encode(['error'=>'Account service is temporarily unavailable. Please try again later.']);}
