import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, UserPlus, KeyRound, Mail, AlertCircle, Loader } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (session: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        
        if (data.session) {
          onLoginSuccess(data.session);
        } else {
          setInfoMsg('Cadastro realizado! Por favor, verifique seu e-mail para confirmar a conta.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (data.session) {
          onLoginSuccess(data.session);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Ocorreu um erro ao processar a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">📂</span>
            <h1>Data5 Memory</h1>
          </div>
          <p className="auth-subtitle">
            {isRegistering 
              ? 'Crie sua conta para sincronizar suas notas em nuvem' 
              : 'Faça login para sincronizar e gerenciar sua base de conhecimento'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          {errorMsg && (
            <div className="auth-alert error">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}
          
          {infoMsg && (
            <div className="auth-alert success">
              <AlertCircle size={18} />
              <span>{infoMsg}</span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">E-mail</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Senha</label>
            <div className="input-wrapper">
              <KeyRound className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <Loader className="spinner" size={18} />
            ) : isRegistering ? (
              <>
                <UserPlus size={18} />
                Cadastrar
              </>
            ) : (
              <>
                <LogIn size={18} />
                Entrar
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <button 
            type="button" 
            className="auth-switch-btn"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg(null);
              setInfoMsg(null);
            }}
          >
            {isRegistering 
              ? 'Já possui uma conta? Entrar' 
              : 'Não tem uma conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};
