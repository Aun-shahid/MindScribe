import { Link } from 'react-router-dom';
import {
  FileText,
  Mic,
  Brain,
  Play,
  BarChart3,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  Download,
  Smartphone,
  MessageCircle,
  Lock,
  TrendingUp
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const LandingNew = () => {
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  // Enhanced parallax effects with performance optimization
  const heroScale = useTransform(
    heroScrollProgress,
    [0, 0.5, 1],
    prefersReducedMotion ? [1, 1, 1] : [1, 1.06, 1.12]
  );

  const heroOpacity = useTransform(
    heroScrollProgress,
    [0, 0.4, 0.75],
    [1, 0.6, 0]
  );

  const heroTextY = useTransform(
    heroScrollProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [0, -90]
  );

  const overlayOpacity = useTransform(
    heroScrollProgress,
    [0, 0.5, 1],
    [0.8, 0.55, 0.3]
  );

  // Workflow timeline data
  const workflowSteps = [
    {
      id: 1,
      icon: Play,
      title: 'Session Begins',
      description: 'Start your therapy session with confidence. MindScribe listens in the background.',
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50',
      glowColor: 'shadow-purple-500/50'
    },
    {
      id: 2,
      icon: Mic,
      title: 'Listening & Recording',
      description: 'Crystal-clear audio capture with intelligent noise reduction and speaker detection.',
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50',
      glowColor: 'shadow-blue-500/50'
    },

    {
      id: 4,
      icon: FileText,
      title: 'SOAP Note Generation',
      description: 'Comprehensive SOAP notes created automatically, following clinical best practices.',
      color: 'from-indigo-400 to-indigo-600',
      bgColor: 'bg-indigo-50',
      glowColor: 'shadow-indigo-500/50'
    },
    {
      id: 5,
      icon: Brain,
      title: 'AI Insights',
      description: 'Emotional sentiment analysis and behavioral patterns identified through advanced AI.',
      color: 'from-pink-400 to-pink-600',
      bgColor: 'bg-pink-50',
      glowColor: 'shadow-pink-500/50'
    },
    {
      id: 6,
      icon: BarChart3,
      title: 'Session Summary',
      description: 'Complete patient overview with progress tracking and actionable insights.',
      color: 'from-orange-400 to-orange-600',
      bgColor: 'bg-orange-50',
      glowColor: 'shadow-orange-500/50'
    }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-white overflow-hidden">
      {/* SECTION 1 - Therapist Hero */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] overflow-hidden px-3 sm:px-4 md:px-8"
        style={{
          background: 'linear-gradient(135deg, #F6F2FF 0%, #E9E1FF 100%)'
        }}
      >
        <div className="absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden md:block">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 680 380"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="680" height="380" fill="#3d2d6e" />
            <polygon points="340,0 520,140 340,200 160,140" fill="#6E5F9E" />
            <polygon points="340,0 160,140 0,80 0,0" fill="#4a3880" />
            <polygon points="340,0 680,0 680,80 520,140" fill="#5a4a90" />
            <polygon points="0,80 160,140 80,260 0,200" fill="#3d2d6e" />
            <polygon points="680,80 680,200 600,260 520,140" fill="#7B6BAE" />
            <polygon points="160,140 340,200 260,310 80,260" fill="#4f3f85" />
            <polygon points="520,140 600,260 420,310 340,200" fill="#8074B8" />
            <polygon points="80,260 260,310 200,380 0,380 0,200" fill="#2e2058" />
            <polygon points="600,260 680,200 680,380 480,380 420,310" fill="#5a4a90" />
            <polygon points="260,310 420,310 480,380 200,380" fill="#3d2d6e" />
            <polygon points="260,310 340,200 420,310 340,360" fill="#6E5F9E" />
            <line x1="340" y1="0" x2="160" y2="140" stroke="#c4b5fd" strokeWidth="0.8" opacity="0.35" />
            <line x1="340" y1="0" x2="520" y2="140" stroke="#c4b5fd" strokeWidth="0.8" opacity="0.35" />
            <line x1="340" y1="0" x2="0" y2="80" stroke="#a78bfa" strokeWidth="0.5" opacity="0.2" />
            <line x1="340" y1="0" x2="680" y2="80" stroke="#a78bfa" strokeWidth="0.5" opacity="0.2" />
            <line x1="160" y1="140" x2="340" y2="200" stroke="#ddd6fe" strokeWidth="0.8" opacity="0.3" />
            <line x1="520" y1="140" x2="340" y2="200" stroke="#ddd6fe" strokeWidth="0.8" opacity="0.3" />
            <line x1="340" y1="200" x2="260" y2="310" stroke="#c4b5fd" strokeWidth="0.6" opacity="0.25" />
            <line x1="340" y1="200" x2="420" y2="310" stroke="#c4b5fd" strokeWidth="0.6" opacity="0.25" />
            <line x1="160" y1="140" x2="80" y2="260" stroke="#7c6aad" strokeWidth="0.5" opacity="0.3" />
            <line x1="520" y1="140" x2="600" y2="260" stroke="#7c6aad" strokeWidth="0.5" opacity="0.3" />
            <line x1="80" y1="260" x2="260" y2="310" stroke="#6d5fa0" strokeWidth="0.5" opacity="0.25" />
            <line x1="600" y1="260" x2="420" y2="310" stroke="#6d5fa0" strokeWidth="0.5" opacity="0.25" />
            <line x1="340" y1="0" x2="680" y2="380" stroke="#ddd6fe" strokeWidth="1.2" opacity="0.06" />
            <line x1="340" y1="0" x2="0" y2="380" stroke="#ddd6fe" strokeWidth="1.2" opacity="0.06" />
            <line x1="340" y1="0" x2="580" y2="380" stroke="#ddd6fe" strokeWidth="0.8" opacity="0.04" />
            <line x1="340" y1="0" x2="100" y2="380" stroke="#ddd6fe" strokeWidth="0.8" opacity="0.04" />
          </svg>
        </div>

        <motion.div className="absolute inset-0" style={{ opacity: overlayOpacity }}>
          <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-[#B8A3FF]/20 blur-3xl" />
          <div className="absolute top-20 -right-20 h-[24rem] w-[24rem] rounded-full bg-[#CFC2FF]/20 blur-3xl" />
        </motion.div>

        <motion.div
          className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col px-3 py-5 sm:px-6 md:px-8 md:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="mb-5 flex items-center md:mb-7"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <Brain className="text-[#7B5FCB]" size={28} />
            <div className="flex items-center gap-2 p-1 text-md font-semibold text-[#1f2d29]">
              MindScribe
            </div>
          </motion.div>

          <div className="grid flex-1 items-center gap-6 pb-4 lg:grid-cols-[60%_40%] lg:gap-8 lg:pb-0">
            <motion.div
              style={{ opacity: heroOpacity, y: heroTextY }}
              className="max-w-xl pt-1 lg:pr-8"
            >
              <motion.p
                className="mb-4 text-sm tracking-[0.25em] text-[#6E5F9E] uppercase"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15 }}
              >
                Your AI Therapy Assistant
              </motion.p>
              <motion.h1
                className="text-3xl font-semibold leading-[1.08] text-[#5A45A5] sm:text-4xl md:text-6xl"
                style={{ fontFamily: 'serif' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
              >
                MindScribe
              </motion.h1>
              <motion.p
                className="mt-4 max-w-xl text-xl font-serif leading-tight text-[#4E3D88] sm:text-2xl md:mt-5 md:text-4xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
              >
                Clarity for every therapy session, every note you write.
              </motion.p>
              <motion.p
                className="mt-4 text-sm font-serif leading-relaxed text-[#6E5F9E] sm:text-base md:mt-5 md:text-lg"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45 }}
              >
                Supporting therapists with real-time transcription, structured SOAP notes, and AI-powered insights so you can focus on patient care.
              </motion.p>

              <motion.div
                className="mt-7"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.55 }}
              >
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white transition-transform hover:-translate-y-1 hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #7B5FCB, #8F74FF)',
                    boxShadow: '0 10px 25px rgba(143,116,255,0.35)'
                  }}
                >
                  Get Started
                  <ArrowRight size={18} />
                </Link>
              </motion.div>

              <motion.div
                className="mt-7 flex items-center gap-3 md:mt-8"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.65 }}
              >
                <div className="flex -space-x-3">
                  {['/images/therapist_face_1.png', '/images/therapist_face_2.png', '/images/therapist_face_3.png'].map((src, i) => (
                    <motion.div
                      key={i}
                      className="h-9 w-9 rounded-full border-2 border-white overflow-hidden"
                      style={{ zIndex: 3 - i }}
                      initial={{ opacity: 0, scale: 0.6, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
                    >
                      <img src={src} alt="Therapist" className="h-full w-full object-cover" />
                    </motion.div>
                  ))}
                </div>
                <motion.p
                  className="text-sm font-medium text-[#6E5F9E]"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1.0 }}
                >
                  Trusted by therapists
                </motion.p>
              </motion.div>
            </motion.div>

            <motion.div
              className="image-container relative mx-auto h-64 w-full max-w-[28rem] overflow-hidden sm:h-80 sm:max-w-[32rem] md:h-[25rem] md:max-w-[34rem] md:overflow-visible lg:h-[78vh]"
              style={{ scale: heroScale }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >


              <img
                src="/images/profff.png"
                alt="Therapist portrait"
                className="therapist-image absolute left-1/2 top-1/2 z-10 m-0 h-[108%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 object-contain p-0 sm:h-[118%] md:left-1/5 md:h-[120%]"
              />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* SECTION 2 - About MindScribe */}
      <section className="relative bg-[#f6f1f4] px-6 py-14 md:px-10">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="relative overflow-visible rounded-[1.8rem] border border-[#e7d7df] bg-[#cbc1eb] p-6 shadow-[0_18px_45px_rgba(127,83,108,0.12)] md:p-10 lg:p-14"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="grid items-center gap-8 md:grid-cols-[36%_64%] md:gap-12">
              <motion.div
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.15 }}
                className="relative"
              >
                <img
                  src="/images/lands.jpg"
                  alt="Therapist using MindScribe during documentation"
                  className="h-[19rem] w-full rounded-2xl object-cover shadow-lg md:h-[22rem]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden h-[19rem] w-full rounded-2xl bg-gradient-to-br from-[#f5e9ef] to-[#e8d2dc] p-6 text-center shadow-lg md:h-[22rem]">
                  <p className="mt-20 text-sm text-[#7d5c6f]">Add image:<br /><code className="rounded bg-white/80 px-2 py-1 text-xs">about-therapy-benefit.png</code></p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.2 }}
              >
                <p className="text-[0.65rem] font-semibold tracking-[0.32em] text-[#8b6a7d] uppercase">About MindScribe</p>
                <h2
                  className="mt-3 text-4xl leading-tight text-[#5f3f52] md:text-5xl"
                  style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
                >
                  Support Your Clients,
                  <br />
                  Not Your Paperwork
                </h2>
                <p className="mt-6 max-w-2xl text-[0.98rem] leading-7 text-[#6e4f61] md:text-[1.02rem]">
                  MindScribe helps therapists spend less emotional energy on documentation and more on real human care.
                  By turning session conversations into clear clinical notes and organized summaries, it reduces after-hours
                  admin load and gives you reliable continuity across every patient journey.
                </p>
                <p className="mt-4 max-w-2xl text-[0.98rem] leading-7 text-[#6e4f61] md:text-[1.02rem]">
                  The result is a calmer workflow: better focus during sessions, fewer missed details, and more time to prepare
                  for meaningful treatment decisions without documentation fatigue.
                </p>


              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 3 - Therapy Workflow Timeline with Timeline Reveal */}
      <section className="relative overflow-hidden bg-[#f8f3f6] py-16 md:py-20">

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div
            className="mb-12 text-center md:mb-14"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-4 text-[0.65rem] font-semibold tracking-[0.32em] text-[#8b6a7d] uppercase">How It Works</p>
            <h2
              className="mb-5 text-4xl leading-tight text-[#5A45A5] md:text-5xl"
              style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
            >
              Your Session,
              <span className="text-[#5A45A5]"> Simplified</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#5A45A5] md:text-lg">
              Follow the journey from session start to comprehensive documentation
            </p>
          </motion.div>

          {/* Timeline with Side-by-Side Visualizations */}
          <div className="relative">
            {/* Vertical Timeline Line */}
            <motion.div
              className="absolute bottom-0 top-0 left-8 w-[2px] rounded-full bg-[#dbc7d2] md:left-1/2"
              initial={{ scaleY: 0, transformOrigin: 'top' }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />

            {/* Timeline Steps */}
            <div className="space-y-12 md:space-y-16">
              {workflowSteps.map((step, index) => {
                const isEven = index % 2 === 0;
                const StepIcon = step.icon;

                return (
                  <motion.div
                    key={step.id}
                    className="relative grid items-center gap-8 md:grid-cols-2"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    {/* Icon Circle */}
                    <div className="absolute left-8 z-20 -translate-x-1/2 md:left-1/2">
                      <motion.div
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d6bcc9] bg-[#f5e9ef] shadow-sm md:h-14 md:w-14"
                        whileInView={{ scale: [0, 1.2, 1] }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                      >
                        <StepIcon className="text-[#5A45A5]" size={22} />
                      </motion.div>
                    </div>

                    {/* Content Side (Text Description) */}
                    <motion.div
                      className={`${isEven ? 'md:order-2 md:pl-12' : 'md:order-1 md:pr-12'} ml-16 md:ml-0`}
                      initial={{ opacity: 0, x: isEven ? 50 : -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
                    >
                      <div className="rounded-2xl border border-[#e6d6de] bg-white/85 p-5 shadow-[0_10px_28px_rgba(120,83,104,0.08)] md:p-6">
                        <h3 className="mb-2 text-xl font-semibold text-[#863898] md:text-2xl">
                          {step.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-[#5A45A5] md:text-base">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>

                    {/* Visualization Side */}
                    <motion.div
                      className={`${isEven ? 'md:order-1 md:pr-12' : 'md:order-2 md:pl-12'} ml-16 md:ml-0`}
                      initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.1 + 0.4 }}
                    >
                      {/* Step 1: Dashboard Image */}
                      {step.id === 1 && (
                        <div className="overflow-hidden rounded-2xl border border-[#e6d6de] bg-white/85 p-3 shadow-[0_10px_28px_rgba(120,83,104,0.08)]">
                          <img
                            src="/images/session-begins-dashboard.png"
                            alt="Dashboard"
                            className="h-auto w-full rounded-xl"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden rounded-xl bg-gradient-to-br from-[#f5e9ef] to-[#e9d7df] p-8 text-center">
                            <Play className="mx-auto mb-3 text-[#7b5f70]" size={48} />
                            <p className="text-xs text-gray-600">Add image:<br /><code className="text-xs bg-white px-2 py-1 rounded">session-begins-dashboard.png</code></p>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Animated Waveform */}
                      {step.id === 2 && (
                        <div className="rounded-2xl border border-[#e6d6de] bg-white/85 p-6 shadow-[0_10px_28px_rgba(120,83,104,0.08)]">
                          <div className="flex items-center justify-center gap-1 h-32">
                            {[...Array(30)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="w-1.5 rounded-full bg-gradient-to-t from-[#bea3b1] to-[#5A45A5]"
                                animate={{
                                  height: [
                                    Math.random() * 80 + 30,
                                    Math.random() * 80 + 30,
                                    Math.random() * 80 + 30
                                  ]
                                }}
                                transition={{
                                  duration: 0.5,
                                  repeat: Infinity,
                                  delay: i * 0.02
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 3: Live Transcription */}


                      {/* Step 4: SOAP Note */}
                      {step.id === 4 && (
                        <div className="space-y-3 rounded-2xl border border-[#e6d6de] bg-white/85 p-6 shadow-[0_10px_28px_rgba(120,83,104,0.08)]">
                          {[
                            { label: 'S', content: 'Patient reports increased anxiety...', delay: 0 },
                            { label: 'O', content: 'Patient appeared moderately anxious...', delay: 0.2 },
                            { label: 'A', content: 'GAD symptoms exacerbated...', delay: 0.4 },
                            { label: 'P', content: 'Continue CBT, stress management...', delay: 0.6 }
                          ].map((section) => (
                            <motion.div
                              key={section.label}
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: section.delay, duration: 0.6 }}
                              className="border-l-4 border-[#b793a6] pl-3"
                            >
                              <h5 className="mb-1 text-xs font-bold text-[#7d3f9f]">{section.label}</h5>
                              <p className="text-sm text-gray-700">{section.content}</p>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Step 5: Emotion Chart */}
                      {step.id === 5 && (
                        <div className="rounded-2xl border border-[#e6d6de] bg-white/85 p-6 shadow-[0_10px_28px_rgba(120,83,104,0.08)]">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'Anxious', value: 75, tone: '#b46b78' },
                              { label: 'Hopeful', value: 45, tone: '#7fa089' },
                              { label: 'Reflective', value: 60, tone: '#7894aa' },
                              { label: 'Concerned', value: 55, tone: '#b09173' }
                            ].map((emotion, i) => (
                              <motion.div
                                key={emotion.label}
                                className="rounded-lg bg-[#f7f1f4] p-3"
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                              >
                                <span className="text-sm font-bold" style={{ color: emotion.tone }}>{emotion.label}</span>
                                <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white">
                                  <motion.div
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{ backgroundColor: emotion.tone }}
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${emotion.value}%` }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 + 0.3, duration: 1 }}
                                  />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 6: Progress Chart */}
                      {step.id === 6 && (
                        <div className="rounded-2xl border border-[#e6d6de] bg-white/85 p-6 shadow-[0_10px_28px_rgba(120,83,104,0.08)]">
                          <div className="flex items-end gap-2 h-32">
                            {[40, 55, 45, 65, 70, 60, 80, 82].map((height, i) => (
                              <motion.div
                                key={i}
                                className="flex-1 rounded-t-lg bg-gradient-to-t from-[#b89aaa] to-[#7b5f70]"
                                initial={{ height: 0 }}
                                whileInView={{ height: `${height}%` }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 - Dashboard Preview */}
      <section className="relative overflow-hidden bg-[#f6f1f7] py-16 md:py-20">
        <div className="pointer-events-none absolute -left-16 top-8 h-72 w-72 rounded-full bg-[#5A45A5]/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-[#7A68BA]/10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-4 text-[0.65rem] font-semibold tracking-[0.32em] text-[#7a68a8] uppercase">Dashboard Preview</p>
            <h2
              className="mb-5 text-4xl text-[#4b3a8d] md:text-5xl"
              style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
            >
              Manage With
              <span className="text-[#6a57b4]"> Ease</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base text-[#62558d] md:text-lg">
              Your complete practice management hub
            </p>
          </motion.div>

          {/* Dashboard UI Preview */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Insight Cards Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Patient Stats Card */}
              <motion.div
                className="rounded-3xl border border-[#ddd2ee] bg-white/90 p-8 shadow-[0_14px_30px_rgba(90,69,165,0.10)] transition-all"
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <Users className="text-[#5A45A5]" size={30} />
                  <span className="rounded-full bg-[#efebfb] px-3 py-1 text-sm font-semibold text-[#5A45A5]">
                    +12%
                  </span>
                </div>
                <h3 className="mb-2 text-4xl font-bold text-[#3f3176]">142</h3>
                <p className="text-[#6b5d93]">Active Patients</p>
              </motion.div>

              {/* Sessions Card */}
              <motion.div
                className="rounded-3xl border border-[#ddd2ee] bg-white/90 p-8 shadow-[0_14px_30px_rgba(90,69,165,0.10)] transition-all"
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <Calendar className="text-[#6A57B4]" size={30} />
                  <span className="rounded-full bg-[#f1edfb] px-3 py-1 text-sm font-semibold text-[#6A57B4]">
                    This week
                  </span>
                </div>
                <h3 className="mb-2 text-4xl font-bold text-[#3f3176]">28</h3>
                <p className="text-[#6b5d93]">Completed Sessions</p>
              </motion.div>

              {/* Time Saved Card */}
              <motion.div
                className="rounded-3xl border border-[#ddd2ee] bg-white/90 p-8 shadow-[0_14px_30px_rgba(90,69,165,0.10)] transition-all"
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <Clock className="text-[#7B68C2]" size={30} />
                  <span className="rounded-full bg-[#f2effc] px-3 py-1 text-sm font-semibold text-[#7B68C2]">
                    Saved
                  </span>
                </div>
                <h3 className="mb-2 text-4xl font-bold text-[#3f3176]">18h</h3>
                <p className="text-[#6b5d93]">Documentation Time</p>
              </motion.div>
            </div>

            {/* Session List Preview */}
            <motion.div
              className="mt-8 rounded-3xl border border-[#ddd2ee] bg-white/90 p-8 shadow-[0_14px_30px_rgba(90,69,165,0.10)]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="mb-6 text-2xl font-bold text-[#4b3a8d]">Recent Sessions</h3>
              <div className="space-y-4">
                {[
                  { patient: 'Sarah M.', time: 'Today, 2:00 PM', status: 'Completed' },
                  { patient: 'John D.', time: 'Today, 3:30 PM', status: 'In Progress' },
                  { patient: 'Emily R.', time: 'Tomorrow, 10:00 AM', status: 'Scheduled' }
                ].map((session, index) => (
                  <motion.div
                    key={session.patient}
                    className="flex flex-col items-start gap-3 rounded-2xl border border-[#e7def3] bg-white p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#7A68BA] to-[#5A45A5] font-bold text-white">
                        {session.patient.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-[#43347d]">{session.patient}</p>
                        <p className="text-sm text-[#7a6da7]">{session.time}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#f1edfb] px-3 py-1 text-sm font-medium text-[#5A45A5]">
                      {session.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Patient App Download Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f6f1f7] via-[#f0eaf9] to-[#e8dff5] py-16 md:py-20">
        <div className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-[#5A45A5]/15 to-[#7A68BA]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-gradient-to-br from-[#8F74FF]/10 to-[#A78BFA]/5 blur-3xl" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left Side - Content */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 rounded-full bg-white/60 border border-[#dbc7d2]">
                  <Smartphone className="text-[#5A45A5]" size={20} />
                  <span className="text-sm font-semibold text-[#5A45A5]">Patient App</span>
                </div>

                <h2 className="mb-6 text-4xl md:text-5xl leading-tight text-[#5A45A5] font-serif">
                  Looking to Connect with Your Therapist?
                </h2>

                <p className="mb-6 text-lg text-[#6E5F9E] leading-relaxed">
                  Download the MindScribe patient app and stay connected with your therapy journey. Access session notes, track your progress, and communicate seamlessly with your therapist in one secure place.
                </p>

                <ul className="space-y-4 mb-10">
                  {[
                    { Icon: Calendar, text: 'Easy session booking and management' },
                    { Icon: TrendingUp, text: 'View your progress and therapy insights' },
                    { Icon: MessageCircle, text: 'Secure messaging with your therapist' },
                    { Icon: Lock, text: 'Your privacy is our priority' }
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      className="flex items-center gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                    >
                      <item.Icon className="w-6 h-6 text-[#7B5FCB] flex-shrink-0" />
                      <span className="text-[#5A45A5] font-medium">{item.text}</span>
                    </motion.div>
                  ))}
                </ul>

                <motion.a
                  href="https://drive.google.com/file/d/1jCx83GcuFxjR5A4E7-bTa4winTW0_1cO/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-white transition transform"
                  style={{
                    background: 'linear-gradient(135deg, #7B5FCB, #8F74FF)',
                    boxShadow: '0 12px 30px rgba(143,116,255,0.3)'
                  }}
                  whileHover={{ scale: 1.05, boxShadow: '0 16px 40px rgba(143,116,255,0.4)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download size={22} />
                  <span>Download App Now</span>
                </motion.a>
              </motion.div>

              {/* Right Side - Visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 40 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                {/* Decorative Phone Frame */}
                <div className="relative mx-auto max-w-xs">
                  {/* Outer Glow */}
                  <motion.div
                    className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-[#8F74FF]/30 to-[#5A45A5]/20 blur-2xl"
                    animate={{
                      opacity: [0.4, 0.6, 0.4]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity
                    }}
                  />

                  {/* iPhone Frame */}
                  <div className="relative rounded-[3rem] overflow-hidden border-8 border-[#1a1a1a] bg-[#1a1a1a] shadow-2xl" style={{ aspectRatio: '9/19.5' }}>
                    {/* Status Bar */}
                    <div className="h-6 bg-[#2d1b4e] border-b border-[#3d2d5e] flex items-center justify-between px-6 text-white text-xs">
                      <span>11:20</span>
                      <div className="flex gap-1">
                        <span>📶</span>
                        <span>📡</span>
                        <span>🔋</span>
                      </div>
                    </div>

                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-[#1a1a1a] rounded-b-3xl z-20" />

                    {/* Phone Content - Onboarding Screen */}
                    <div className="h-full bg-gradient-to-b from-[#2d1b4e] via-[#3a2954] to-[#2d1b4e] p-6 flex flex-col justify-between overflow-hidden relative">
                      {/* MindScribe Logo */}
                      <div className="text-center pt-4">
                        <div className="font-bold text-white text-sm mb-2">MindScribe</div>
                      </div>

                      {/* Illustration Area */}
                      <motion.div
                        className="flex-1 flex items-center justify-center"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <div className="text-center">
                          {/* Simple Illustration - Healing Journey */}
                          <svg width="140" height="140" viewBox="0 0 140 140" className="mx-auto mb-4">
                            {/* Happy face illustration */}
                            <circle cx="70" cy="50" r="35" fill="#e8dff5" opacity="0.9" />
                            <circle cx="58" cy="42" r="4" fill="#2d1b4e" />
                            <circle cx="82" cy="42" r="4" fill="#2d1b4e" />
                            <path d="M 58 60 Q 70 68 82 60" stroke="#2d1b4e" strokeWidth="2" fill="none" strokeLinecap="round" />

                            {/* Body/Hands */}
                            <rect x="55" y="85" width="30" height="25" rx="4" fill="#7B5FCB" opacity="0.8" />
                            <circle cx="45" cy="95" r="6" fill="#e8dff5" opacity="0.8" />
                            <circle cx="95" cy="95" r="6" fill="#e8dff5" opacity="0.8" />

                            {/* Decorative circles (emotions) */}
                            <circle cx="30" cy="30" r="8" fill="#FFC0CB" opacity="0.6" />
                            <circle cx="110" cy="40" r="10" fill="#A78BFA" opacity="0.6" />
                            <circle cx="25" cy="90" r="7" fill="#CFC2FF" opacity="0.5" />
                          </svg>
                        </div>
                      </motion.div>

                      {/* Onboarding Text */}
                      <div className="text-center pb-8">
                        <h2 className="text-xl font-bold text-white mb-2">
                          Welcome to your
                          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#CFC2FF] to-[#A78BFA]">
                            safe space
                          </span>
                        </h2>
                        <p className="text-sm text-[#b6a5d6] mb-6">
                          where healing begins gently
                        </p>

                        <button className="w-full py-3 bg-gradient-to-r from-[#7B5FCB] to-[#8F74FF] text-white rounded-full font-semibold text-sm">
                          Get Started
                        </button>

                        {/* Swipe indicator */}
                        <p className="text-xs text-[#8b7ba5] mt-6">Swipe left to continue →</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4c398f] via-[#5A45A5] to-[#6e5bb8] py-18 md:py-24">
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-white/25"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [1, 1.5, 1]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#9b8ad7]/30 blur-3xl" />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-4 text-[0.65rem] font-semibold tracking-[0.3em] text-[#d7ccfa] uppercase">Get Started</p>
            <h2
              className="mb-6 text-4xl text-white md:text-5xl lg:text-6xl"
              style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
            >
              Ready to Transform Your Practice?
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-lg text-[#e2d9ff] md:text-xl">
              Join thousands of therapists who trust MindScribe for their documentation needs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-lg font-bold text-[#4f3d93] shadow-2xl transition-all hover:bg-[#f4efff]"
                >
                  Start Free Trial
                  <ArrowRight size={20} />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Brain className="text-purple-400" size={32} />
              <span className="text-2xl font-bold">MindScribe</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400 sm:gap-8">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>

            <p className="text-sm text-gray-400">
              © 2026 MindScribe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingNew;



