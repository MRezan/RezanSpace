<?php
declare(strict_types=1);
function issueSession(PDO $pdo,int $userId,string $name,string $email):array{
 $token=bin2hex(random_bytes(32));
 $q=$pdo->prepare('INSERT INTO user_sessions(user_id,token_hash,expires_at) VALUES(?,?,NULL)');
 $q->execute([$userId,hash('sha256',$token)]);
 return ['token'=>$token,'user'=>['id'=>$userId,'name'=>$name,'email'=>$email]];
}
