import { useParams } from 'react-router-dom';

export default function BusinessProfile() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Business Profile</h1>
      <p className="text-slate-500 mt-1">Editing business {id}</p>
    </div>
  );
}
