import { Link } from 'react-router-dom';
import { Zap, Mail, Phone, MapPin } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Shop',
    links: [
      { label:'All Products',  to:'/shop'                    },
      { label:'New Arrivals',  to:'/shop?sort=newest'        },
      { label:'Best Sellers',  to:'/shop?sort=featured'      },
      { label:'Deals',         to:'/shop?discount=true'      },
      { label:'Electronics',   to:'/shop?category=electronics'},
    ],
  },
  {
    title: 'Customer Service',
    links: [
      { label:'Contact Us',      to:'/' },
      { label:'FAQ',             to:'/' },
      { label:'Shipping Policy', to:'/' },
      { label:'Returns & Refunds', to:'/' },
      { label:'Track Order',     to:'/orders' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label:'My Profile',  to:'/profile'  },
      { label:'My Orders',   to:'/orders'   },
      { label:'Wishlist',    to:'/wishlist' },
      { label:'Addresses',   to:'/profile'  },
      { label:'Login',       to:'/login'    },
    ],
  },
  {
    title: 'Company',
    links: [
      { label:'About VYORA', to:'/' },
      { label:'Privacy Policy', to:'/' },
      { label:'Terms of Service', to:'/' },
      { label:'Careers',     to:'/' },
      { label:'Press',       to:'/' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t mt-16" style={{ background:'var(--vyora-card)', borderColor:'var(--vyora-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <Zap size={18} className="text-white" fill="white"/>
              </div>
              <span className="text-xl font-extrabold tracking-tight" style={{ color:'var(--vyora-text)' }}>
                VY<span className="text-indigo-500">ORA</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-4" style={{ color:'var(--vyora-muted)' }}>
              Shop Smart. Live Better. Your premium e-commerce destination for quality products at the best prices.
            </p>
            <div className="space-y-2 text-xs" style={{ color:'var(--vyora-muted)' }}>
              <div className="flex items-center gap-2"><Mail size={13} className="text-indigo-500"/> support@vyora.in</div>
              <div className="flex items-center gap-2"><Phone size={13} className="text-indigo-500"/> +91 98765 43210</div>
              <div className="flex items-center gap-2"><MapPin size={13} className="text-indigo-500"/> Mumbai, Maharashtra</div>
            </div>
          </div>

          {/* Link columns */}
          {SECTIONS.map(sec => (
            <div key={sec.title}>
              <h4 className="text-sm font-extrabold uppercase tracking-widest mb-4" style={{ color:'var(--vyora-text)' }}>{sec.title}</h4>
              <ul className="space-y-2.5">
                {sec.links.map(l => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm hover:text-indigo-500 transition" style={{ color:'var(--vyora-muted)' }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor:'var(--vyora-border)' }}>
          <p className="text-xs" style={{ color:'var(--vyora-muted)' }}>© 2024 VYORA. All rights reserved. Built with ❤️ — B.Tech Final Year Project</p>
          <div className="flex items-center gap-2">
            {['💳','🔒','📦'].map((e,i) => (
              <div key={i} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-sm">
                {e}
              </div>
            ))}
            <span className="text-xs font-semibold ml-1" style={{ color:'var(--vyora-muted)' }}>Secure Payments</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
