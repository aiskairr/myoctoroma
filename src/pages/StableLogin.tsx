import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface LoginFormData {
  email: string;
  password: string;
}

// Добавляем CSS анимацию для спиннера
const spinKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

export default function StableLogin() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  useLocation();

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include"
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData && userData.id) {
            // Пользователь уже авторизован, перенаправляем
            window.location.href = "/";
            return;
          }
        }
      } catch (err) {
        console.log("User not authenticated");
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Очищаем ошибку при изменении полей
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Простая валидация
    if (!formData.email || !formData.password) {
      setError("Пожалуйста, заполните все поля");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
        credentials: "include"
      });

      if (response.ok) {
        // Успешная авторизация - перенаправляем с полной перезагрузкой
        window.location.href = "/";
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || "Неверный логин или пароль");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Ошибка соединения с сервером");
    } finally {
      setIsLoading(false);
    }
  };

  // Показываем загрузку если проверяем авторизацию
  if (isCheckingAuth) {
    return (
      <>
        <style>{spinKeyframes}</style>
        <div style={{ 
          minHeight: "100vh", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ 
              width: "40px", 
              height: "40px", 
              border: "4px solid #e5e7eb", 
              borderTop: "4px solid #2563eb", 
              borderRadius: "50%", 
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem"
            }}></div>
            <p style={{ color: "#6b7280", margin: 0 }}>Проверка авторизации...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      backgroundColor: "#f5f5f5",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        width: "100%",
        maxWidth: "400px",
        margin: "0 1rem"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ 
            fontSize: "1.5rem", 
            fontWeight: "600", 
            color: "#1f2937",
            margin: "0 0 0.5rem 0"
          }}>
            Octa CRM
          </h1>
          <p style={{ 
            color: "#6b7280", 
            fontSize: "0.9rem",
            margin: 0
          }}>
            Система управления салоном
          </p>
        </div>
          
        <form onSubmit={handleSubmit}>
            <div style={{
              backgroundColor: "#f3f4f6",
              padding: "1rem",
              borderRadius: "6px",
              marginTop: "1rem",
              fontSize: "0.8rem",
              color: "#4b5563"
            }}>
              <label 
                htmlFor="email" 
                style={{ 
                  display: "block", 
                  fontSize: "0.9rem", 
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem"
                }}
              >
                Email / Логин
              </label>
              <input
                id="email"
                name="email"
                type="text"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Введите ваш email или логин"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: isLoading ? "#f9fafb" : "white",
                  boxSizing: "border-box"
                }}
              />
            </div>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <label 
                htmlFor="password" 
                style={{ 
                  display: "block", 
                  fontSize: "0.9rem", 
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem"
                }}
              >
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Введите ваш пароль"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: isLoading ? "#f9fafb" : "white",
                  boxSizing: "border-box"
                }}
              />
            </div>
            
            {error && (
              <div style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: "0.75rem",
                borderRadius: "6px",
                fontSize: "0.9rem",
                marginBottom: "1rem",
                textAlign: "center"
              }}>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading || !formData.email || !formData.password}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: isLoading || !formData.email || !formData.password 
                  ? "#9ca3af" 
                  : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: isLoading || !formData.email || !formData.password 
                  ? "not-allowed" 
                  : "pointer",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => {
                if (!isLoading && formData.email && formData.password) {
                  e.currentTarget.style.backgroundColor = "#1d4ed8";
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading && formData.email && formData.password) {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                }
              }}
            >
              {isLoading ? "Входим..." : "Войти"}
            </button>
          </form>
        
        <div style={{
          marginTop: "1.5rem",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "#9ca3af"
        }}>
          <p style={{ margin: 0 }}>
            Система управления салоном
          </p>
        </div>
      </div>
    </div>
  );
}