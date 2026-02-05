import { Link } from 'react-router-dom';
import { 
  FileText, 
  Mic,
  MessageSquare,
  Brain,
  ChevronDown,
  Play,
  BarChart3,
  Calendar,
  Clock,
  Smile,
  Frown,
  Meh,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const LandingNew = () => {
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [typingText, setTypingText] = useState('');

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Enhanced parallax effects with performance optimization
  const heroScale = useTransform(
    heroScrollProgress,
    [0, 0.5, 1],
    prefersReducedMotion ? [1, 1, 1] : [1, 1.08, 1.15]
  );

  const heroBlur = useTransform(
    heroScrollProgress,
    [0, 0.5, 1],
    prefersReducedMotion ? [0, 0, 0] : [0, 4, 8]
  );

  const heroOpacity = useTransform(
    heroScrollProgress,
    [0, 0.3, 0.7],
    [1, 0.5, 0]
  );

  const heroTextY = useTransform(
    heroScrollProgress,
    [0, 0.5, 1],
    prefersReducedMotion ? [0, 0, 0] : [0, -75, -150]
  );

  const overlayOpacity = useTransform(
    heroScrollProgress,
    [0, 0.5, 1],
    [0.7, 0.5, 0.3]
  );

  // Scroll indicator animation
  const scrollIndicatorY = useTransform(scrollYProgress, [0, 0.1], [0, 20]);
  const scrollIndicatorOpacity = useTransform(heroScrollProgress, [0, 0.3], [1, 0]);

  // Typing animation effect for transcription - continuous
  useEffect(() => {
    const fullText = "Patient reports feeling anxious about work deadlines and struggling with sleep patterns...";
    let currentIndex = 0;
    setTypingText('');
    
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTypingText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 30);

    return () => clearInterval(typingInterval);
  }, []);

  // Workflow timeline data
  const workflowSteps = [
    {
      id: 1,
      icon: Play,
      title: "Session Begins",
      description: "Start your therapy session with confidence. MindScribe listens in the background.",
      color: "from-purple-400 to-purple-600",
      bgColor: "bg-purple-50",
      glowColor: "shadow-purple-500/50"
    },
    {
      id: 2,
      icon: Mic,
      title: "Listening & Recording",
      description: "Crystal-clear audio capture with intelligent noise reduction and speaker detection.",
      color: "from-blue-400 to-blue-600",
      bgColor: "bg-blue-50",
      glowColor: "shadow-blue-500/50"
    },
    {
      id: 3,
      icon: MessageSquare,
      title: "Real-Time Transcription",
      description: "Bilingual transcription with 95%+ accuracy. See your session documented as it happens.",
      color: "from-teal-400 to-teal-600",
      bgColor: "bg-teal-50",
      glowColor: "shadow-teal-500/50"
    },
    {
      id: 4,
      icon: FileText,
      title: "SOAP Note Generation",
      description: "Comprehensive SOAP notes created automatically, following clinical best practices.",
      color: "from-indigo-400 to-indigo-600",
      bgColor: "bg-indigo-50",
      glowColor: "shadow-indigo-500/50"
    },
    {
      id: 5,
      icon: Brain,
      title: "AI Insights",
      description: "Emotional sentiment analysis and behavioral patterns identified through advanced AI.",
      color: "from-pink-400 to-pink-600",
      bgColor: "bg-pink-50",
      glowColor: "shadow-pink-500/50"
    },
    {
      id: 6,
      icon: BarChart3,
      title: "Session Summary",
      description: "Complete patient overview with progress tracking and actionable insights.",
      color: "from-orange-400 to-orange-600",
      bgColor: "bg-orange-50",
      glowColor: "shadow-orange-500/50"
    }
  ];

  // Live session simulation data - removed transcriptLines as it's not used

  const soapNotes = {
    subjective: "Patient reports increased anxiety symptoms, particularly in morning hours. Expresses concern about work-related stressors and upcoming deadlines.",
    objective: "Patient appeared moderately anxious. Maintained eye contact, speech was clear and coherent. Fidgeting noted during discussion of work stressors.",
    assessment: "Generalized anxiety disorder symptoms exacerbated by occupational stress. Patient demonstrates insight into triggers.",
    plan: "Continue cognitive behavioral therapy. Introduce stress management techniques. Schedule follow-up in one week."
  };

  // Emotion visualization data
  const emotions = [
    { label: "Anxious", intensity: 75, color: "text-red-500", bgColor: "bg-red-100" },
    { label: "Reflective", intensity: 60, color: "text-blue-500", bgColor: "bg-blue-100" },
    { label: "Hopeful", intensity: 45, color: "text-green-500", bgColor: "bg-green-100" },
    { label: "Concerned", intensity: 55, color: "text-orange-500", bgColor: "bg-orange-100" }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-white overflow-hidden">
      {/* SECTION 1 - Full Screen Hero */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Enhanced Scroll Effects */}
        <motion.div 
          className="absolute inset-0"
          style={{ 
            scale: heroScale,
            filter: heroBlur.get() !== undefined ? `blur(${heroBlur.get()}px)` : 'blur(0px)',
          }}
        >
          <motion.img
            src="/images/lands.jpg"
            alt="Therapy Session Background"
            className="w-full h-full object-cover"
            style={{ 
              filter: useTransform(heroBlur, (blur) => `blur(${blur}px)`)
            }}
          />
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-indigo-900/60 to-purple-800/70"
            style={{ opacity: overlayOpacity }}
          />
        </motion.div>

        {/* Gradient Bridge to Next Section */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent via-gray-50/50 to-gray-50 pointer-events-none z-20"
          style={{ opacity: heroScrollProgress }}
        />

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Hero Content with Enhanced Scroll Animation */}
        <motion.div
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
          style={{ 
            opacity: heroOpacity,
            y: heroTextY
          }}
        >
          <motion.h1 
            className="text-5xl md:text-6xl lg:text-7xl font-serif text-white mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">MindScribe</span>
            <br />
            <span className="text-4xl md:text-5xl">your therapy assistant.</span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-purple-100 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            Supporting therapists with clarity, care, and intelligent documentation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <Link
              to="/register"
              className="inline-flex items-center gap-3 bg-white hover:bg-gray-100 text-purple-900 px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-2xl hover:shadow-purple-500/50"
            >
              Start Your Journey
              <ArrowRight size={20} />
            </Link>
          </motion.div>
        </motion.div>

        {/* Enhanced Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-30"
          style={{ 
            y: scrollIndicatorY,
            opacity: scrollIndicatorOpacity
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <span className="text-white/70 text-sm font-medium">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="text-white/70" size={32} />
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION 2 - Therapy Workflow Timeline with Timeline Reveal */}
      <section className="py-32 bg-gradient-to-br from-gray-50 to-purple-50/30 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-purple-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-blue-200 rounded-full opacity-20 blur-3xl" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl font-serif text-gray-900 mb-6">
              Your Session,
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"> Simplified</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Follow the journey from session start to comprehensive documentation
            </p>
          </motion.div>

          {/* Timeline with Side-by-Side Visualizations */}
          <div className="relative">
            {/* Vertical Timeline Line */}
            <motion.div 
              className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 via-blue-400 to-pink-400 rounded-full"
              initial={{ scaleY: 0, transformOrigin: 'top' }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />

            {/* Timeline Steps */}
            <div className="space-y-24">
              {workflowSteps.map((step, index) => {
                const isEven = index % 2 === 0;
                const StepIcon = step.icon;

                return (
                  <motion.div
                    key={step.id}
                    className="relative grid md:grid-cols-2 gap-8 items-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    {/* Icon Circle */}
                    <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-20">
                      <motion.div
                        className={`w-16 h-16 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                        whileInView={{ scale: [0, 1.2, 1] }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                      >
                        <StepIcon className="text-white" size={28} />
                      </motion.div>
                    </div>

                    {/* Content Side (Text Description) */}
                    <motion.div
                      className={`${isEven ? 'md:order-2 md:pl-12' : 'md:order-1 md:pr-12'} ml-24 md:ml-0`}
                      initial={{ opacity: 0, x: isEven ? 50 : -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
                    >
                      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                          {step.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>

                    {/* Visualization Side */}
                    <motion.div
                      className={`${isEven ? 'md:order-1 md:pr-12' : 'md:order-2 md:pl-12'} ml-24 md:ml-0`}
                      initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.1 + 0.4 }}
                    >
                      {/* Step 1: Dashboard Image */}
                      {step.id === 1 && (
                        <div className="bg-white rounded-2xl p-4 shadow-lg border border-purple-100">
                          <img 
                            src="/images/session-begins-dashboard.png" 
                            alt="Dashboard"
                            className="w-full h-auto rounded-xl"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl p-8 text-center">
                            <Play className="mx-auto mb-3 text-purple-600" size={48} />
                            <p className="text-xs text-gray-600">Add image:<br /><code className="text-xs bg-white px-2 py-1 rounded">session-begins-dashboard.png</code></p>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Animated Waveform */}
                      {step.id === 2 && (
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
                          <div className="flex items-center justify-center gap-1 h-32">
                            {[...Array(30)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="w-2 bg-gradient-to-t from-blue-400 to-blue-600 rounded-full"
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
                      {step.id === 3 && (
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-teal-100 space-y-3">
                          <div className="bg-purple-50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-purple-600 mb-1">THERAPIST</p>
                            <p className="text-sm text-gray-800">How have you been feeling this week?</p>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-3 ml-6">
                            <p className="text-xs font-semibold text-blue-600 mb-1">PATIENT</p>
                            <p className="text-sm text-gray-800">{typingText}<motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>|</motion.span></p>
                          </div>
                        </div>
                      )}

                      {/* Step 4: SOAP Note */}
                      {step.id === 4 && (
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-indigo-100 space-y-3">
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
                              className="border-l-4 border-indigo-400 pl-3"
                            >
                              <h5 className="text-xs font-bold text-indigo-600 mb-1">{section.label}</h5>
                              <p className="text-sm text-gray-700">{section.content}</p>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Step 5: Emotion Chart */}
                      {step.id === 5 && (
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-pink-100">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'Anxious', value: 75, color: 'red' },
                              { label: 'Hopeful', value: 45, color: 'green' },
                              { label: 'Reflective', value: 60, color: 'blue' },
                              { label: 'Concerned', value: 55, color: 'orange' }
                            ].map((emotion, i) => (
                              <motion.div
                                key={emotion.label}
                                className={`bg-${emotion.color}-50 rounded-lg p-3`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                              >
                                <span className={`text-sm font-bold text-${emotion.color}-600`}>{emotion.label}</span>
                                <div className="relative h-2 bg-white rounded-full overflow-hidden mt-2">
                                  <motion.div
                                    className={`absolute inset-y-0 left-0 bg-${emotion.color}-500 rounded-full`}
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
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-orange-100">
                          <div className="flex items-end gap-2 h-32">
                            {[40, 55, 45, 65, 70, 60, 80, 82].map((height, i) => (
                              <motion.div
                                key={i}
                                className="flex-1 bg-gradient-to-t from-orange-400 to-orange-600 rounded-t-lg"
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

      {/* SECTION 3 - Interactive Live Session Simulation */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-blue-50/50" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl font-serif text-gray-900 mb-6">
              See It In
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"> Action</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience how MindScribe transforms your session into comprehensive documentation
            </p>
          </motion.div>

          {/* Three Column Layout */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* LEFT - Recording Interface */}
            <motion.div
              className="bg-gradient-to-br from-purple-50 to-white rounded-3xl p-8 border border-purple-200 shadow-xl"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  className="w-3 h-3 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-sm font-semibold text-gray-700">Recording</span>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-center w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-purple-700 rounded-full mb-4 shadow-lg">
                  <Mic className="text-white" size={32} />
                </div>
                <p className="text-center text-sm text-gray-600">Session in Progress</p>
              </div>

              {/* Audio Waveform */}
              <div className="flex items-center justify-center gap-1 h-24 mb-6">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-gradient-to-t from-purple-400 to-purple-600 rounded-full"
                    animate={{
                      height: [
                        Math.random() * 60 + 20,
                        Math.random() * 60 + 20,
                        Math.random() * 60 + 20
                      ]
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.05
                    }}
                  />
                ))}
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold text-purple-900">12:34</p>
                <p className="text-sm text-gray-500">Session Duration</p>
              </div>
            </motion.div>

            {/* CENTER - Live Transcription */}
            {/* <motion.div
              className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="text-blue-600" size={24} />
                <h3 className="text-lg font-bold text-gray-900">Live Transcription</h3>
              </div>

              <div className="space-y-4 h-96 overflow-y-auto">
                {transcriptLines.map((line, index) => (
                  <motion.div
                    key={index}
                    className={`p-4 rounded-2xl ${
                      line.speaker === 'Therapist' 
                        ? 'bg-purple-50 ml-0 mr-8' 
                        : 'bg-blue-50 ml-8 mr-0'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 0.5, delay: index * 0.3 }}
                  >
                    <p className="text-xs font-semibold text-gray-500 mb-1">
                      {line.speaker}
                    </p>
                    <p className="text-sm text-gray-700">{line.text}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="mt-4 flex items-center gap-2 text-sm text-gray-500"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Activity size={16} className="text-green-500" />
                <span>Transcribing in real-time...</span>
              </motion.div>
            </motion.div> */}

            {/* RIGHT - SOAP Note */}
            <motion.div
              className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-8 border border-indigo-200 shadow-xl"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <FileText className="text-indigo-600" size={24} />
                <h3 className="text-lg font-bold text-gray-900">SOAP Note</h3>
              </div>

              <div className="space-y-6">
                {Object.entries(soapNotes).map(([key, value], index) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
                      {key}
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {value}
                    </p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="mt-6 flex items-center gap-2 text-xs text-green-600 bg-green-50 px-4 py-2 rounded-full"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1 }}
              >
                <CheckCircle2 size={14} />
                <span>Auto-generated & ready to review</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 4 - Emotional Insight Visualization */}
      <section className="py-32 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl font-serif text-gray-900 mb-6">
              Emotional
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600"> Intelligence</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              AI-powered sentiment analysis reveals emotional patterns and insights
            </p>
          </motion.div>

          {/* Emotion Visualization */}
          <div className="relative">
            {/* Center Waveform */}
            <motion.div
              className="flex items-center justify-center gap-2 h-32 mb-12"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {[...Array(40)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 bg-gradient-to-t from-pink-400 via-purple-400 to-blue-400 rounded-full"
                  animate={{
                    height: [
                      Math.random() * 80 + 20,
                      Math.random() * 80 + 20,
                      Math.random() * 80 + 20
                    ]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.03
                  }}
                />
              ))}
            </motion.div>

            {/* Floating Emotion Tags */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {emotions.map((emotion, index) => (
                <motion.div
                  key={emotion.label}
                  className={`${emotion.bgColor} rounded-2xl p-6 border border-gray-200 shadow-lg`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ 
                    y: -10,
                    scale: 1.05,
                    transition: { type: "spring", stiffness: 300 }
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-lg font-bold ${emotion.color}`}>
                      {emotion.label}
                    </span>
                    {emotion.label === "Anxious" && <Frown className={emotion.color} size={24} />}
                    {emotion.label === "Reflective" && <Meh className={emotion.color} size={24} />}
                    {emotion.label === "Hopeful" && <Smile className={emotion.color} size={24} />}
                    {emotion.label === "Concerned" && <Frown className={emotion.color} size={24} />}
                  </div>
                  
                  <div className="relative h-2 bg-white rounded-full overflow-hidden">
                    <motion.div
                      className={`absolute inset-y-0 left-0 ${emotion.color.replace('text', 'bg')}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${emotion.intensity}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2">{emotion.intensity}% detected</p>
                </motion.div>
              ))}
            </div>

            {/* Key Phrases */}
            <motion.div
              className="mt-12 bg-white rounded-3xl p-8 border border-gray-200 shadow-xl"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Sparkles className="text-purple-600" size={24} />
                Key Emotional Phrases
              </h3>
              <div className="flex flex-wrap gap-3">
                {["I've been struggling", "feeling anxious", "work-related stressors", "upcoming deadlines"].map((phrase, index) => (
                  <motion.span
                    key={phrase}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.1 }}
                  >
                    "{phrase}"
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 5 - Dashboard Preview */}
      <section className="py-32 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl font-serif text-gray-900 mb-6">
              Manage With
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"> Ease</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
            {/* Glass Cards Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Patient Stats Card */}
              <motion.div
                className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-purple-200 shadow-xl hover:shadow-2xl transition-all"
                whileHover={{ y: -10, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <Users className="text-purple-600" size={32} />
                  <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                    +12%
                  </span>
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-2">142</h3>
                <p className="text-gray-600">Active Patients</p>
              </motion.div>

              {/* Sessions Card */}
              <motion.div
                className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-blue-200 shadow-xl hover:shadow-2xl transition-all"
                whileHover={{ y: -10, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <Calendar className="text-blue-600" size={32} />
                  <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                    This week
                  </span>
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-2">28</h3>
                <p className="text-gray-600">Completed Sessions</p>
              </motion.div>

              {/* Time Saved Card */}
              <motion.div
                className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-green-200 shadow-xl hover:shadow-2xl transition-all"
                whileHover={{ y: -10, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <Clock className="text-green-600" size={32} />
                  <span className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                    Saved
                  </span>
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-2">18h</h3>
                <p className="text-gray-600">Documentation Time</p>
              </motion.div>
            </div>

            {/* Session List Preview */}
            <motion.div
              className="mt-8 bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-gray-200 shadow-xl"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Sessions</h3>
              <div className="space-y-4">
                {[
                  { patient: "Sarah M.", time: "Today, 2:00 PM", status: "Completed", color: "green" },
                  { patient: "John D.", time: "Today, 3:30 PM", status: "In Progress", color: "blue" },
                  { patient: "Emily R.", time: "Tomorrow, 10:00 AM", status: "Scheduled", color: "purple" }
                ].map((session, index) => (
                  <motion.div
                    key={session.patient}
                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {session.patient.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{session.patient}</p>
                        <p className="text-sm text-gray-500">{session.time}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${session.color}-100 text-${session.color}-700`}>
                      {session.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 relative overflow-hidden">
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-6">
              Ready to Transform Your Practice?
            </h2>
            <p className="text-xl text-purple-200 mb-12 max-w-2xl mx-auto">
              Join thousands of therapists who trust MindScribe for their documentation needs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-3 bg-white text-purple-900 px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:bg-gray-100 transition-all"
                >
                  Start Free Trial
                  <ArrowRight size={20} />
                </Link>
              </motion.div>
              
              {/* <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/demo"
                  className="inline-flex items-center gap-3 bg-purple-800/50 text-white border-2 border-white/30 px-8 py-4 rounded-full font-bold text-lg hover:bg-purple-800 transition-all"
                >
                  Watch Demo
                </Link>
              </motion.div> */}
            </div>

            {/* <p className="mt-8 text-purple-200 text-sm">
              No credit card required • 14-day free trial • Cancel anytime
            </p> */}
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

            <div className="flex gap-8 text-sm text-gray-400">
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
