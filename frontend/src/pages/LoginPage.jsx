import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { postForm } from "../utils/api";
import "../styles/auth.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    const messages = {
      wrong_credentials: "Неверный e-mail или пароль",
      password_mismatch: "Пароли не совпадают",
      email_exists: "Пользователь с таким e-mail уже существует",
    };
    setErrorMessage(messages[error] || "Произошла ошибка");
  }, [searchParams]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const { resp, data } = await postForm("/login", { email, password });

      if (!resp.ok) {
        setErrorMessage(data.error || "Ошибка входа. Попробуйте ещё раз.");
        return;
      }

      if (resp.redirected) {
        window.location.href = resp.url;
        return;
      }

      navigate("/");
    } catch {
      setErrorMessage("Не удалось отправить запрос. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page login-page">
      <div className="container">
        <h1 className="title">Вход в аккаунт</h1>
        <p className="subtitle">Введите свои данные, чтобы продолжить.</p>

        <div className="wrapper">
          <form className="card" onSubmit={onSubmit}>
            {errorMessage && <div className="auth-error">{errorMessage}</div>}

            <div className="grid">
              <div className="full-width">
                <label htmlFor="login-email">E-mail</label>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  placeholder="example@mail.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="full-width">
                <label htmlFor="login-password">Пароль</label>
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit" disabled={loading}>
              {loading ? "Входим..." : "Войти"}
            </button>

            <p className="bottom-text">
              Нет аккаунта?{" "}
              <Link to="/register" className="logreg-link">
                Зарегистрироваться
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
