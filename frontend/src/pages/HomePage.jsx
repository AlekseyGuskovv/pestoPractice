import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <TopNav />

      <section id="header">
        <div className="header-container">
          <h1>Добро пожаловать в Pesto</h1>
          <p>Настоящий вкус Италии в сердце вашего города</p>

          <button type="button" onClick={() => navigate("/booking")}>
            Забронировать стол
          </button>
          <button type="button" onClick={() => navigate("/menu")}>
            Посмотреть меню
          </button>
        </div>
      </section>

      <section id="description">
        <div className="container">
          <h2>О ресторане</h2>
          <p>
            Мы в Pesto предлагаем вам уникальную атмосферу и аутентичные блюда
            итальянской кухни, приготовленные только из свежайших продуктов.
            Погрузитесь в мир настоящей Италии!
          </p>
        </div>
      </section>

      <section id="section1">
        <div className="header-container">
          <h2>Лучшие итальянские пиццы в городе</h2>
          <p>Более 5 видов традиционных пицц, приготовленных в дровяной печи</p>
        </div>
      </section>

      <section id="contact">
        <div className="container">
          <h2>Контакты</h2>
          <p>Адрес: ул. Главная, д. 10</p>
          <p>Телефон: +7 (900) 000-00-00</p>
        </div>
      </section>

      <footer>
        <div className="container">
          <p>&copy; 2025 Pesto. Все права защищены.</p>
        </div>
      </footer>
    </>
  );
}
