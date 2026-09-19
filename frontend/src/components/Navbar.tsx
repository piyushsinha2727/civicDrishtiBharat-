import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, LogOut, Menu, X, User, LayoutDashboard, FileText, Building2, Bell } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { WeatherWidget } from '@/components/WeatherWidget';
import { TimeWidget } from '@/components/TimeWidget';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getDashboardPath = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'resolver') return '/resolver';
    return '/dashboard';
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-red-900/40 bg-[#7a0000] text-white shadow-md">
      <div className="container max-w-7xl mx-auto px-3 sm:px-6 flex h-14 sm:h-16 items-center justify-between gap-2">
        
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl overflow-hidden shadow-sm transition-transform group-hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-red-600" />
            <span className="relative z-10 text-white font-black text-[11px] sm:text-[13px] tracking-tight leading-none select-none">CDB</span>
          </div>
          
          <div className="flex flex-col leading-none">
            <span
              className="text-[15px] sm:text-[18px] font-black tracking-tight text-white leading-none flex items-center"
              style={{ fontFamily: "'Montserrat', 'Inter', sans-serif" }}
            >
              CivicDrishti
              <span className="ml-1 text-amber-300 font-extrabold">Bharat</span>
            </span>
            <span className="hidden sm:block text-[8px] font-bold uppercase tracking-[0.16em] text-red-200/80 mt-0.5">
              Urban AI Governance
            </span>
          </div>
        </Link>

        {/* Desktop Controls (md+) */}
        <div className="hidden md:flex items-center gap-2">
          <WeatherWidget />
          <TimeWidget />
          <LanguageToggle />
          <ThemeToggle />
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 flex items-center gap-2 pl-1.5 pr-3 rounded-full hover:bg-white/10 text-white border border-white/20 transition-all">
                  <Avatar className="h-6 w-6 border border-white/30 shadow-sm">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=800000,000000`} alt={user.name} />
                    <AvatarFallback className="text-[10px] bg-amber-500 text-white font-semibold">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold tracking-tight">{user.name.split(' ')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 border-border/50 shadow-lg mt-1" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded w-fit">
                      Role: {user.role || 'Citizen'}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(getDashboardPath())} className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>View Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); navigate('/'); }} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className="text-white/90 hover:text-white hover:bg-white/10 font-semibold transition-all"
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/register')}
                className="bg-amber-400 hover:bg-amber-300 text-red-950 font-black tracking-wide shadow-md hover:shadow-glow transition-all duration-300"
              >
                Get Started
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Header Bar Controls (Optimized for 320px - 430px screens) */}
        <div className="flex items-center gap-2 md:hidden">
          {user ? (
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-white/30 bg-white/10 text-white shadow-sm overflow-hidden"
              aria-label="User Profile"
            >
              <Avatar className="h-full w-full">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=800000,000000`} alt={user.name} />
                <AvatarFallback className="text-[11px] bg-amber-500 text-white font-bold">
                  {user.name.substring(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate('/login')}
              className="h-8 px-3 text-xs font-black bg-amber-400 hover:bg-amber-300 text-red-950 rounded-lg shadow-sm"
            >
              Sign In
            </Button>
          )}

          {/* Hamburger Toggle */}
          <button
            aria-label="Toggle navigation menu"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-white hover:bg-white/15 transition-colors border border-white/20"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-red-900/60 bg-[#5c0000] text-white overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              
              {/* Widgets & Toggles on Mobile */}
              <div className="flex items-center justify-between pb-3 border-b border-white/15 text-xs text-white/90">
                <TimeWidget />
                <div className="flex items-center gap-2">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
              </div>

              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-white/10 rounded-xl border border-white/15">
                    <Avatar className="h-10 w-10 border border-white/30">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=800000,000000`} alt={user.name} />
                      <AvatarFallback className="bg-amber-500 text-white font-bold">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-white truncate">{user.name}</span>
                      <span className="text-xs text-red-200/80 truncate">{user.email}</span>
                      <span className="text-[10px] text-amber-300 font-bold uppercase mt-0.5">Role: {user.role || 'Citizen'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button
                      variant="ghost"
                      onClick={() => { navigate(getDashboardPath()); setMobileOpen(false); }}
                      className="justify-start bg-white/5 hover:bg-white/15 text-white h-10 text-xs font-bold rounded-lg"
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4 text-amber-400" /> Dashboard
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { navigate('/profile'); setMobileOpen(false); }}
                      className="justify-start bg-white/5 hover:bg-white/15 text-white h-10 text-xs font-bold rounded-lg"
                    >
                      <User className="mr-2 h-4 w-4 text-blue-300" /> My Profile
                    </Button>
                  </div>

                  {user.role === 'citizen' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => { navigate('/dashboard?tab=report'); setMobileOpen(false); }}
                        className="justify-start bg-white/5 hover:bg-white/15 text-white h-10 text-xs font-bold rounded-lg"
                      >
                        <FileText className="mr-2 h-4 w-4 text-emerald-400" /> Report Issue
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { navigate('/applications/sent'); setMobileOpen(false); }}
                        className="justify-start bg-white/5 hover:bg-white/15 text-white h-10 text-xs font-bold rounded-lg"
                      >
                        <Bell className="mr-2 h-4 w-4 text-purple-300" /> Track Status
                      </Button>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => { logout(); navigate('/'); setMobileOpen(false); }}
                    className="justify-center bg-red-950/70 hover:bg-red-950 text-red-200 hover:text-white border border-red-800/60 mt-1 h-10 font-bold text-xs rounded-lg"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-2.5 pt-1">
                  <Button
                    onClick={() => { navigate('/login'); setMobileOpen(false); }}
                    className="w-full bg-white/15 hover:bg-white/25 text-white font-bold h-11 rounded-xl text-sm"
                  >
                    Sign In to Your Account
                  </Button>
                  <Button
                    onClick={() => { navigate('/register'); setMobileOpen(false); }}
                    className="w-full bg-amber-400 hover:bg-amber-300 text-red-950 font-black h-11 rounded-xl text-sm shadow-md"
                  >
                    Create New Account (Get Started)
                  </Button>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
