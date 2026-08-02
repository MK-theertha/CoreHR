import { useNavigate } from 'react-router-dom';

type LoginPageProps = {
  onLogin: () => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin();
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-corehr-50 font-bold text-corehr-600">
            CH
          </div>
          <h1 className="text-2xl font-bold text-slate-900">CoreHR</h1>
          <p className="mt-2 text-sm text-slate-500">Employee management and compliance platform</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              defaultValue="admin@corehr.dev"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-corehr-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              defaultValue="Admin@123"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-corehr-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-corehr-600 px-4 py-3 font-semibold text-white transition hover:bg-corehr-500"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
          <button type="button" className="hover:text-slate-700">
            Forgot password?
          </button>
          <button type="button" className="hover:text-slate-700">
            Use demo account
          </button>
        </div>
      </div>
    </div>
  );
}
