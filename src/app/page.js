import { redirect } from 'next/navigation';

// Identity only serves sign-in and account pages. The public service list is the Catalogue app's home page.
export default function Home() {
  redirect('/login');
}
