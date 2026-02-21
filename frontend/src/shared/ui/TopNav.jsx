import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { isLoggedIn } from "../utils/cookies";
import { logoutUrl } from "../api/auth";

export default function TopNav({ showCart, cartLabel, onCartClick, cartDisabled }) {
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, [location.pathname]);

  const isActive = (path) => (location.pathname === path ? "active-link" : "");

  return (
    <header className="top-nav">
      <div className="nav-center">
        <Link to="/" className={isActive("/")}>
          Главная
        </Link>
        <Link to="/menu" className={isActive("/menu")}>
          Меню
        </Link>
        <Link to="/booking" className={isActive("/booking")}>
          Бронирование
        </Link>
        {loggedIn && (
          <Link to="/history" className={isActive("/history")}>
            История
          </Link>
        )}
      </div>

      <div className="nav-right">
        {showCart && (
          <button
            type="button"
            className="nav-btn cart-btn"
            disabled={cartDisabled}
            onClick={onCartClick}
          >
            {cartLabel}
          </button>
        )}

        {!loggedIn && (
          <>
            <Link to="/login" className="nav-btn">
              Войти
            </Link>
            <Link to="/register" className="nav-btn">
              Регистрация
            </Link>
          </>
        )}

        {loggedIn && (
          <a href={logoutUrl()} className="nav-btn">
            Выйти
          </a>
        )}
      </div>
    </header>
  );
}
