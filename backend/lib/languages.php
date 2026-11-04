<?php
declare(strict_types=1);
function supportedLanguages():array{return ['en','es','pt-BR','hi','id','ar','fr','de','ja','bn','vi','tr','ko','it','pl'];}
function postLanguage(mixed $value='en'):string{
 if(!is_string($value)||!in_array($value,supportedLanguages(),true)){http_response_code(422);exit(json_encode(['error'=>'Unsupported story language.']));}
 return $value;
}
function postTranslationKey(mixed $value):?string{
 if($value===null||$value==='')return null;
 if(!is_string($value)||!preg_match('/^[a-zA-Z0-9_-]{1,100}$/D',$value)){http_response_code(422);exit(json_encode(['error'=>'translation_key must contain 1–100 ASCII letters, numbers, underscores or hyphens.']));}
 return $value;
}
function localizedPostPath(array $post):string{return '/'.postLanguage($post['language']??'en').'/post/'.rawurlencode($post['slug']).'/';}
