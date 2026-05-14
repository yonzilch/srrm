import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../contexts/I18nContext';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
        active
          ? 'border-b-2 border-ctp-blue text-ctp-text'
          : 'border-b-2 border-transparent text-ctp-overlay0 hover:text-ctp-subtext1 hover:border-ctp-surface1'
      }`}
    >
      {children}
    </Link>
  );
}

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
  };

  // 取邮箱首字母作为头像
  const initials = user?.email
    ? user.email.charAt(0).toUpperCase()
    : '?';

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'zh' : 'en');
    setLangMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-ctp-base text-ctp-text">
      <nav className="border-b border-white/10 bg-ctp-mantle/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* 左侧 Logo + 导航 */}
            <div className="flex items-center gap-6">
              <Link to="/" className="text-xl font-bold tracking-tight text-ctp-text">
                SRRM
              </Link>
              <div className="hidden sm:flex sm:items-center sm:gap-1">
                <NavLink to="/">{t('nav.releases')}</NavLink>
                {user?.role === 'admin' && (
                  <>
                    <NavLink to="/admin">{t('nav.repos')}</NavLink>
                    <NavLink to="/admin/settings">{t('nav.settings')}</NavLink>
                  </>
                )}
              </div>
            </div>

            {/* 右侧用户区域 */}
            <div className="flex items-center gap-2">
              {/* 语言切换按钮 — 放在头像左侧 */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLangMenuOpen(!langMenuOpen);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-ctp-subtext1 hover:text-ctp-text hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                >
                  <span className="text-xs font-medium">
                    {locale === 'en' ? '🇬🇧' : '🇨🇳'}
                  </span>
                  <span className="hidden sm:inline">
                    {locale === 'en' ? 'EN' : '中文'}
                  </span>
                  <svg
                    className={`h-3 w-3 text-ctp-overlay0 transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {langMenuOpen && (
                  <div className="absolute right-0 mt-1 w-32 rounded-xl border border-ctp-surface1 bg-ctp-mantle shadow-lg py-1 z-30">
                    <button
                      onClick={() => setLocale('en')}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        locale === 'en'
                          ? 'text-ctp-blue bg-ctp-blue/10'
                          : 'text-ctp-subtext1 hover:bg-white/5'
                      }`}
                    >
                      🇬🇧 English
                    </button>
                    <button
                      onClick={() => setLocale('zh')}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        locale === 'zh'
                          ? 'text-ctp-blue bg-ctp-blue/10'
                          : 'text-ctp-subtext1 hover:bg-white/5'
                      }`}
                    >
                      🇨🇳 中文
                    </button>
                  </div>
                )}
              </div>

              {!loading && user ? (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(!menuOpen);
                    }}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-white/5 border border-transparent hover:border-white/10"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ctp-surface1 text-xs font-medium text-ctp-subtext1">
                      {initials}
                    </span>
                    <span className="text-ctp-subtext1">{user.email}</span>
                    <svg
                      className={`h-3.5 w-3.5 text-ctp-overlay0 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-1.5 w-40 rounded-xl border border-ctp-surface1 bg-ctp-mantle shadow-lg py-1 z-20">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-ctp-subtext1 hover:bg-white/5 transition-colors"
                      >
                        {t('nav.signOut')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                !loading && (
                  <Link
                    to="/login"
                    className="text-sm text-ctp-subtext1 hover:text-ctp-text transition-colors"
                  >
                    {t('nav.signIn')}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}