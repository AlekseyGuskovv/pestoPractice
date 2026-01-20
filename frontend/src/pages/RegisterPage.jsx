import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { postForm } from "../utils/api";
import "../styles/auth.css";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const { resp, data } = await postForm("/register", {
        name,
        phone,
        email,
        password,
        password_confirm: passwordConfirm,
      });

      if (!resp.ok) {
        setErrorMessage(data.error || "Ошибка регистрации.");
        return;
      }

      if (resp.redirected) {
        window.location.href = resp.url;
        return;
      }

      navigate("/login");
    } catch {
      setErrorMessage("Не удалось отправить запрос. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page register-page">
      <div className="container">
        <h1 className="title">Регистрация</h1>
        <p className="subtitle">
          Создайте аккаунт, чтобы бронировать столики онлайн.
        </p>

        <div className="wrapper">
          <form className="card" onSubmit={onSubmit}>
            {errorMessage && <div className="auth-error">{errorMessage}</div>}

            <div className="grid">
              <div>
                <label htmlFor="reg-name">Имя</label>
                <input
                  type="text"
                  id="reg-name"
                  name="name"
                  placeholder="Как к вам обращаться?"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-phone">Телефон</label>
                <input
                  type="tel"
                  id="reg-phone"
                  name="phone"
                  placeholder="+7 (___) ___-__-__"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="full-width">
                <label htmlFor="reg-email">E-mail</label>
                <input
                  type="email"
                  id="reg-email"
                  name="email"
                  placeholder="example@mail.ru"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-password">Пароль</label>
                <input
                  type="password"
                  id="reg-password"
                  name="password"
                  placeholder="Придумайте пароль"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-password2">Повторите пароль</label>
                <input
                  type="password"
                  id="reg-password2"
                  name="password_confirm"
                  placeholder="Повторите пароль"
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit" disabled={loading}>
              {loading ? "Регистрируем..." : "Зарегистрироваться"}
            </button>

            <p className="bottom-text">
              Уже есть аккаунт?{" "}
              <Link to="/login" className="logreg-link">
                Войти
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
