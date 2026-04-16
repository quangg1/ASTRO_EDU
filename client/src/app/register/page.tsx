'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Sparkles } from 'lucide-react'
import { register } from '@/lib/authApi'
import { FirebaseAuthButtons } from '@/components/auth/FirebaseAuthButtons'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import { useAuthStore } from '@/store/useAuthStore'
import { SiteLogo } from '@/components/ui/SiteLogo'
import { sr } from '@/lib/ssrStableRandom'
import { trackEvent } from '@/lib/analytics'
import { viText } from '@/messages/vi'

function FloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: sr(i * 7 + 1) * 100,
    y: sr(i * 7 + 2) * 100,
    size: sr(i * 7 + 3) * 3 + 1,
    duration: sr(i * 7 + 4) * 20 + 10,
    delay: sr(i * 7 + 5) * 5,
    driftX: sr(i * 7 + 6) * 20 - 10,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/30"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, p.driftX, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError(viText.auth.passwordMinLength)
      return
    }
    setLoading(true)
    try {
      const res = await register(email, password, displayName || undefined)
      if (res.success && res.user) {
        trackEvent('register_success', { provider: 'local' })
        setUser(res.user)
        router.push('/dashboard')
        return
      }
      setError(res.error || viText.auth.registerFailed)
    } catch {
      setError(viText.auth.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex">
      {/* Left - Astronomy Image (desktop) */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        <div className="absolute inset-0">
          <img
            src={getStaticAssetUrl('/images/nebula-home.jpg')}
            alt="Nebula"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <FloatingParticles />
        <div className="relative z-10 flex flex-col gap-6 p-16 justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="flex justify-start"
          >
            <SiteLogo className="text-2xl" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h1 className="font-[Poppins,sans-serif] font-semibold text-[56px] text-white leading-[64px] mb-4">
              Bắt đầu hành trình của bạn
            </h1>
            <p className="font-[Poppins,sans-serif] text-[20px] text-white/90 max-w-[500px] leading-relaxed">
              Tạo tài khoản để tham gia Cosmo Learn — khám phá thiên văn bằng mô phỏng 3D tương tác.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right - Auth Form */}
      <div className="w-full lg:w-1/2 relative overflow-y-auto">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-slate-950 via-amber-950/50 to-slate-950"
          animate={{
            background: [
              'linear-gradient(135deg, #0a0a0f 0%, #422006 48%, #0a0a0f 100%)',
              'linear-gradient(135deg, #0a0a0f 0%, #3d2a0a 48%, #0a0a0f 100%)',
              'linear-gradient(135deg, #0a0a0f 0%, #451a03 48%, #0a0a0f 100%)',
              'linear-gradient(135deg, #0a0a0f 0%, #422006 48%, #0a0a0f 100%)',
            ],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="absolute inset-0 overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                top: `${sr(i + 1000) * 100}%`,
                left: `${sr(i + 2000) * 100}%`,
                width: sr(i + 3000) * 3 + 1,
                height: sr(i + 4000) * 3 + 1,
              }}
              animate={{
                opacity: [0.1, 1, 0.1],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: sr(i + 5000) * 3 + 2,
                repeat: Infinity,
                delay: sr(i + 6000) * 2,
              }}
            />
          ))}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`shoot-${i}`}
              className="absolute h-[2px] w-[100px] bg-gradient-to-r from-transparent via-white to-transparent"
              style={{ top: `${sr(i + 7000) * 50}%`, left: '-100px' }}
              animate={{ x: ['0vw', '120vw'], y: ['0vh', '40vh'] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 7,
                ease: 'easeIn',
              }}
            />
          ))}
        </div>

        <FloatingParticles />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:block absolute top-6 sm:top-12 right-4 sm:right-12 z-20"
        >
          <p className="font-[Poppins,sans-serif] text-[16px] text-white/80">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-white font-medium underline hover:text-amber-300 transition-colors"
            >
              Đăng nhập
              <Sparkles className="size-4" />
            </Link>
          </p>
        </motion.div>

        <div className="lg:hidden absolute top-6 left-4 z-20">
          <SiteLogo className="text-xl" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-8 lg:p-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[568px] flex flex-col gap-8 sm:gap-12 pt-16 sm:pt-0"
          >
            <h2 className="font-[Poppins,sans-serif] font-medium text-[30px] sm:text-[40px] text-white">
              {viText.auth.createAccount}
            </h2>

            <div className="flex flex-col gap-4">
              <FirebaseAuthButtons redirectTo="/dashboard" />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-white/20" />
              <span className="font-medium text-[18px] text-white/60">HOẶC</span>
              <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent via-white/20 to-white/20" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/20 text-red-300 text-sm border border-red-400/30">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-[4px] w-full">
                <label className="font-[Poppins,sans-serif] text-white/80 text-[16px]">
                  Tên hiển thị (không bắt buộc)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tên của bạn"
                  className="h-[56px] w-full rounded-[12px] bg-white/10 backdrop-blur-md border border-white/20 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400/60 focus:bg-white/15 transition-all duration-300"
                />
              </div>

              <div className="flex flex-col gap-[4px] w-full">
                <label className="font-[Poppins,sans-serif] text-white/80 text-[16px]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  required
                  className="h-[56px] w-full rounded-[12px] bg-white/10 backdrop-blur-md border border-white/20 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400/60 focus:bg-white/15 transition-all duration-300"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-[Poppins,sans-serif] text-white/80 text-[16px]">
                    Mật khẩu (ít nhất 6 ký tự)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors text-[14px]"
                  >
                    {showPassword ? (
                      <><EyeOff className="size-4" /> Ẩn</>
                    ) : (
                      <><Eye className="size-4" /> Hiện</>
                    )}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tạo mật khẩu"
                  required
                  minLength={6}
                  className="h-[56px] w-full rounded-[12px] bg-white/10 backdrop-blur-md border border-white/20 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400/60 focus:bg-white/15 transition-all duration-300"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02, boxShadow: loading ? 'none' : '0 0 40px rgba(245, 166, 35, 0.45)' }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="h-[56px] sm:h-[64px] w-full rounded-[28px] sm:rounded-[32px] bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-400 hover:via-orange-400 hover:to-orange-500 text-white font-[Poppins,sans-serif] text-[18px] sm:text-[20px] font-medium transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                <span className="relative z-10">
                  {loading ? viText.auth.creatingAccount : viText.nav.signUp}
                </span>
              </motion.button>

              <div className="lg:hidden text-center">
                <p className="font-[Poppins,sans-serif] text-[16px] text-white/80">
                  Đã có tài khoản?{' '}
                  <Link
                    href="/login"
                    className="text-white font-medium underline hover:text-amber-300"
                  >
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
