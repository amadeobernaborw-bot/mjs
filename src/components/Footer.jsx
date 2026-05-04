import { Link } from 'react-router-dom';

export default function Footer({ profile }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__cols">
          <div className="footer__col">
            <h4>Tienda</h4>
            <ul>
              <li><a href="#productos">Productos</a></li>
              <li><a href="#canje">Plan Canje</a></li>
              <li><a href="#servicios">Por qué MJ</a></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Contacto</h4>
            <ul>
              {profile?.whatsapp && <li><a href={`https://wa.me/${profile.whatsapp.replace(/[^\d]/g,'')}`} target="_blank" rel="noreferrer">WhatsApp</a></li>}
              {profile?.instagram_url && <li><a href={profile.instagram_url} target="_blank" rel="noreferrer">Instagram</a></li>}
              {profile?.facebook_url && <li><a href={profile.facebook_url} target="_blank" rel="noreferrer">Facebook</a></li>}
            </ul>
          </div>
          <div className="footer__col">
            <h4>Local</h4>
            <ul>
              {profile?.address && <li>{profile.address}</li>}
              {profile?.google_maps_url && <li><a href={profile.google_maps_url} target="_blank" rel="noreferrer">Cómo llegar</a></li>}
            </ul>
          </div>
          <div className="footer__col">
            <h4>Acerca de</h4>
            <ul>
              <li>{profile?.store_name || 'MJ STORE'}</li>
              <li>Apple Premium Reseller</li>
              <li><Link to="/admin">Admin</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <span>Copyright © {year} {profile?.store_name || 'MJ STORE'}. Todos los derechos reservados.</span>
          <span>Apple, iPhone, iPad, Mac y AirPods son marcas registradas de Apple Inc.</span>
        </div>
      </div>
    </footer>
  );
}
