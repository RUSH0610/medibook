import { Link } from "react-router-dom";
import { Mail, Phone, Clock } from "lucide-react";

const Footer = () => (
  <footer className="bg-dark text-gray-400 mt-16">
    <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">M</span>
          </div>
          <span className="font-bold text-white text-base">MediBook</span>
        </div>
        <p className="text-sm leading-relaxed">
          Book appointments with trusted doctors easily. Your health is our
          priority.
        </p>
      </div>

      <div>
        <h4 className="text-white font-semibold mb-3 text-sm">Quick Links</h4>
        <ul className="space-y-2 text-sm">
          {["/", "/doctors", "/login"].map((path, i) => (
            <li key={path}>
              <Link to={path} className="hover:text-white transition-colors">
                {["Home", "Find Doctors", "Login"][i]}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-white font-semibold mb-3 text-sm">Contact</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2"><Mail size={16} /> support@medibook.com</li>
          <li className="flex items-center gap-2"><Phone size={16} /> +91 9173278536</li>
          <li className="flex items-center gap-2"><Clock size={16} /> Mon–Sat, 9AM–6PM</li>
        </ul>
      </div>
    </div>

  </footer>
);

export default Footer;
