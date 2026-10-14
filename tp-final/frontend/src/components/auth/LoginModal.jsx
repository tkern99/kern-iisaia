import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import './LoginModal.css';

export default function LoginModal() {
  const { login } = useAuthStore();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('1234');
  const [availableUsers, setAvailableUsers] = useState([
    { id: 1, email: 'demo@edulayout.org' }
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/api/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableUsers(data);
        }
      })
      .catch(err => {
        console.warn('Usando usuarios por defecto:', err);
      });
  }, []);

  const handleLoginSubmit = async (emailToLogin, pwdToLogin) => {
    const targetEmail = (emailToLogin || emailInput).trim();
    const targetPwd = (pwdToLogin !== undefined ? pwdToLogin : passwordInput).trim();

    if (!targetEmail) {
      setErrorMsg('Por favor ingresa un email o nombre de usuario.');
      return;
    }

    if (!targetPwd) {
      setErrorMsg('Por favor ingresa una contraseña.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPwd })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Error al iniciar sesión');
      }

      const data = await res.json();
      login(data.user, data.token);
    } catch (err) {
      console.warn('Error de login:', err.message);
      setErrorMsg(err.message || 'Error de conexión con el backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (email) => {
    setEmailInput(email);
    setPasswordInput('1234');
    handleLoginSubmit(email, '1234');
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🔬</div>
          <h2>EduLayout</h2>
          <p>Editor de Layouts CMOS (GPDK045 45nm)</p>
        </div>

        <div className="login-body">
          <p className="login-intro">
            Ingreso de usuario colaborativo con contraseña:
          </p>

          <div className="quick-users-label">Cuentas rápidas de prueba (Contraseña: 1234):</div>
          <div className="quick-users-list">
            {availableUsers.map(u => (
              <button
                key={u.id}
                type="button"
                className="quick-user-chip"
                onClick={() => handleQuickSelect(u.email)}
                title={`Ingresar como ${u.email} (contraseña: 1234)`}
              >
                <span className="user-avatar">👤</span>
                <span className="user-email">{u.email}</span>
                <span className="user-pass-badge">pwd: 1234</span>
              </button>
            ))}
          </div>

          <div className="login-divider">
            <span>o ingresa tus credenciales</span>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleLoginSubmit(); }}>
            <div className="input-group">
              <label htmlFor="user-email-input">Email / Nombre de usuario</label>
              <input
                id="user-email-input"
                type="text"
                placeholder="ej. alumno@fiuba.ar"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label htmlFor="user-password-input">Contraseña</label>
              <input
                id="user-password-input"
                type="password"
                placeholder="Contraseña (por defecto: 1234)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              <span className="password-hint">Contraseña por defecto para cuentas demo: <code>1234</code></span>
            </div>

            {errorMsg && <div className="login-error">{errorMsg}</div>}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Verificando credenciales…' : 'Iniciar Sesión →'}
            </button>
          </form>
        </div>

        <div className="login-footer">
          <span>Control de versiones y bloqueo por checkout colaborativo activo</span>
        </div>
      </div>
    </div>
  );
}
