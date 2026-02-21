import { useState } from "react";
import { resolveImageUrl } from "../../shared/utils/images";

export default function DishCard({ item, onAddToCart }) {
  const [qty, setQty] = useState(1);

  const decrease = () => setQty((v) => (v <= 1 ? 1 : v - 1));
  const increase = () => setQty((v) => v + 1);

  const handleAdd = () => {
    const safeQty = qty >= 1 ? qty : 1;
    onAddToCart(item, safeQty);
  };

  const imageUrl = resolveImageUrl(item.image_url);
  const imageStyle = imageUrl
    ? {
        backgroundImage: `url('${imageUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div className="dish-card" data-category={item.category?.key || ""}>
      <div className="dish-image" style={imageStyle} />

      <h3>{item.name}</h3>

      <div className="dish-info">
        <span className="dish-weight">{item.weight ? `${item.weight} г` : "\u00a0"}</span>
        <span className="dish-price">
          {item.price != null ? `${item.price} ₽` : ""}
        </span>
      </div>

      <p className="dish-desc">{item.description || "\u00a0"}</p>

      <div className="dish-actions">
        <div className="qty">
          <button type="button" className="qty-btn qty-minus" onClick={decrease}>
            −
          </button>
          <input
            type="number"
            className="qty-input"
            min="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          />
          <button type="button" className="qty-btn qty-plus" onClick={increase}>
            +
          </button>
        </div>
        <button type="button" className="add-to-cart-btn" onClick={handleAdd}>
          В корзину
        </button>
      </div>
    </div>
  );
}
