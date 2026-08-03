'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FollowButton } from './follow-button';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
type Person = { id?:number; name:string; bio:string; post_count:number; follower_count:number };

export function PeopleSuggestions() {
  const [people, setPeople] = useState<Person[]>([]);
  useEffect(() => {
    const token = localStorage.getItem('rezantech_session');
    fetch(`${API}/api/people.php?limit=3`, { headers:token ? { Authorization:`Bearer ${token}` } : {} })
      .then(response => response.json()).then(data => setPeople(data.data || []));
  }, []);
  return <section><h3>People to follow</h3>{people.map((person,index) => <div className="suggest" key={person.name}>
    <Link className={`avatar a${index}`} href={`/author/?name=${encodeURIComponent(person.name)}`}>{person.name[0]}</Link>
    <p><Link href={`/author/?name=${encodeURIComponent(person.name)}`}><b>{person.name}</b></Link><small>{person.bio || `${person.post_count} technology stories`}</small></p>
    <FollowButton author={person.name} compact/>
  </div>)}</section>;
}
