// FIX: Implemented the AuthPage component to provide a valid module export.
import React, { useState } from 'react';
import { auth, db } from '../firebase';

export const AuthPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgotPassword'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (authMode === 'login') {
        await auth.signInWithEmailAndPassword(email, password);
      } else if (authMode === 'signup') {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        // Send verification email
        await userCredential.user?.sendEmailVerification();
        // Save user profile to Firestore
        await db.collection('users').doc(userCredential.user?.uid).set({
            uid: userCredential.user?.uid,
            name,
            phone,
            email,
            createdAt: new Date(),
        });
        setMessage("Account created! A verification email has been sent to your inbox.");
        setAuthMode('login'); // Switch to login view after successful signup
      } else if (authMode === 'forgotPassword') {
        await auth.sendPasswordResetEmail(email);
        setMessage("Password reset email sent! Please check your inbox.");
        setAuthMode('login');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderFormFields = () => {
    if (authMode === 'forgotPassword') {
        return (
            <div>
              <label htmlFor="email" className="block text-slate-300 font-semibold mb-2">Email Address</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
            </div>
        );
    }

    return (
      <>
        {authMode === 'signup' && (
          <>
            <div>
              <label htmlFor="name" className="block text-slate-300 font-semibold mb-2">Full Name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
            </div>
            <div>
              <label htmlFor="phone" className="block text-slate-300 font-semibold mb-2">Phone Number</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., +1234567890" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
            </div>
          </>
        )}
        <div>
          <label htmlFor="email" className="block text-slate-300 font-semibold mb-2">Email Address</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
        </div>
        <div>
          <label htmlFor="password"className="block text-slate-300 font-semibold mb-2">Password</label>
          {/* FIX: Replaced redundant condition with `required` attribute. The password field is only rendered when not in 'forgotPassword' mode, so it's always required. */}
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" required/>
        </div>
      </>
    );
  };
  
  const getButtonText = () => {
      switch(authMode) {
          case 'login': return 'Sign In';
          case 'signup': return 'Create Account';
          case 'forgotPassword': return 'Send Reset Email';
      }
  }

  const getTitleText = () => {
    switch(authMode) {
        case 'login': return 'Sign In';
        case 'signup': return 'Sign Up';
        case 'forgotPassword': return 'Reset Password';
    }
}


  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6 text-center">
          Content Spark AI
        </h1>
        <h2 className="text-xl font-semibold text-slate-200 mb-6 text-center">
          {getTitleText()}
        </h2>
        <form onSubmit={handleAuthAction} className="space-y-6">
          {renderFormFields()}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {message && <p className="text-green-400 text-sm text-center">{message}</p>}
          <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
            {getButtonText()}
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
          {authMode === 'login' && (
             <>
                <button onClick={() => setAuthMode('signup')} className="text-cyan-400 hover:text-cyan-300">
                    Need an account? Sign Up
                </button>
                <span className="mx-2 text-slate-500">|</span>
                <button onClick={() => setAuthMode('forgotPassword')} className="text-cyan-400 hover:text-cyan-300">
                    Forgot Password?
                </button>
             </>
          )}
          {authMode === 'signup' && (
            <button onClick={() => setAuthMode('login')} className="text-cyan-400 hover:text-cyan-300">
              Already have an account? Sign In
            </button>
          )}
          {authMode === 'forgotPassword' && (
            <button onClick={() => setAuthMode('login')} className="text-cyan-400 hover:text-cyan-300">
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};