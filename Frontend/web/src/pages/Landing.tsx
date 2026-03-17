import { Link } from 'react-router-dom';
import { 
  FileText, 
  Globe, 
  Heart, 
  Users, 
  Shield, 
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Star,
  Zap
} from 'lucide-react';
import { motion, useScroll, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const Landing = () => {
  useScroll();
  const [typedText, setTypedText] = useState('');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  
  const phrases = [
    'your therapy assistant',
    'AI-powered documentation',
    'multilingual transcription',
    'emotional insights'
  ];

  // Typing animation effect
  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting && typedText !== currentPhrase) {
        setTypedText(currentPhrase.slice(0, typedText.length + 1));
      } else if (isDeleting && typedText !== '') {
        setTypedText(currentPhrase.slice(0, typedText.length - 1));
      } else if (!isDeleting && typedText === currentPhrase) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && typedText === '') {
        setIsDeleting(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [typedText, isDeleting, currentPhraseIndex]);

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const toggleCardFlip = (id: number) => {
    setFlippedCards(prev => 
      prev.includes(id) ? prev.filter(cardId => cardId !== id) : [...prev, id]
    );
  };
  
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const features = [
    {
      id: 1,
      title: 'Automated SOAP Notes',
      description: 'Generate comprehensive SOAP notes automatically from your therapy sessions. Save hours of documentation time and focus more on your patients.',
      icon: FileText,
      imagePath: '/images/soap-notes.png',
      imageAlt: 'Automated SOAP Notes Interface',
      color: 'from-purple-400 to-pink-400'
    },
    {
      id: 2,
      title: 'Intelligent Audio Processing',
      description: 'Real-time audio transcription happens seamlessly in the background, powering AI-driven SOAP note generation and intelligent insights—no manual transcription needed.',
      icon: Globe,
      imagePath: '/images/bilingual.png',
      imageAlt: 'Intelligent Audio Processing',
      color: 'from-blue-400 to-purple-400'
    },
    {
      id: 3,
      title: 'Emotional Sentiment Analysis',
      description: 'Track emotional patterns and sentiment throughout sessions. Gain deeper insights into your patients\' emotional journey and progress.',
      icon: Heart,
      imagePath: '/images/emotion-analysis.jpg',
      imageAlt: 'Emotional Sentiment Analysis Dashboard',
      color: 'from-pink-400 to-red-400'
    },
    {
      id: 4,
      title: 'Patient Management',
      description: 'Organize and manage all your patient information in one secure place. Access patient histories, notes, and progress with ease.',
      icon: Users,
      imagePath: '/images/patient-management.png',
      imageAlt: 'Patient Management System',
      color: 'from-indigo-400 to-purple-400'
    },
    {
      id: 5,
      title: 'Secure and Compliant',
      description: 'HIPAA-compliant security ensures your patient data is always protected. End-to-end encryption and secure cloud storage.',
      icon: Shield,
      imagePath: '/images/security.png',
      imageAlt: 'Security and Compliance Features',
      color: 'from-green-400 to-teal-400'
    },
    {
      id: 6,
      title: 'Progress Monitoring',
      description: 'Track patient progress over time with detailed analytics and visualizations. Make data-driven treatment decisions.',
      icon: TrendingUp,
      imagePath: '/images/progress-monitoring.png',
      imageAlt: 'Progress Monitoring Dashboard',
      color: 'from-yellow-400 to-orange-400'
    }
  ];

  const stats = [
    { label: 'Active Therapists', value: '5,000+', icon: Users },
    { label: 'Sessions Documented', value: '100K+', icon: FileText },
    { label: 'Time Saved (Hours)', value: '50K+', icon: Zap },
    { label: 'Patient Satisfaction', value: '98%', icon: Star }
  ];

  const benefits = [
    'Save 5+ hours per week on documentation',
    'Improve patient care with data-driven insights',
    'Reduce administrative burden by 70%',
    'Access your practice from anywhere',
    'HIPAA-compliant and secure',
    'Get started in under 5 minutes'
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section with Full Screen Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Purple Overlay */}
        <div className="absolute inset-0">
          <img
            src="/images/lands.png"
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          {/* Purple Overlay */}
          <div className="absolute inset-0 bg-black/60" />
          
          {/* Floating parallax shapes */}
          <motion.div
            className="absolute top-20 left-20 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"
            animate={{
              x: mousePosition.x * 30,
              y: mousePosition.y * 30,
            }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          />
          <motion.div
            className="absolute bottom-40 right-32 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl"
            animate={{
              x: mousePosition.x * -40,
              y: mousePosition.y * -40,
            }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/3 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl"
            animate={{
              x: mousePosition.x * 20,
              y: mousePosition.y * -25,
            }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          />
        </div>

        {/* Navigation Bar on Top of Hero */}
        <motion.nav 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 z-50 py-6"
        >
          <div className="max-w-7xl mx-auto px-6 flex justify-center items-center gap-8">
            <motion.button
              onClick={() => scrollToSection('features')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 rounded-lg font-semibold text-white hover:bg-purple-800/50 font-serif transition-all"
            >
              Features
            </motion.button>
            
            <motion.button
              onClick={() => scrollToSection('about')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 rounded-lg font-serif font-semibold text-white hover:bg-purple-800/50 transition-all"
            >
              About
            </motion.button>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/register"
                className="px-6 py-2 rounded-lg font-semibold bg-purple-700 font-serif hover:bg-purple-800 text-white transition-all"
              >
                Register
              </Link>
            </motion.div>
          </div>
        </motion.nav>

        {/* Hero Content - Center */}
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-8 leading-tight min-h-[200px] flex items-center justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <span className="inline-block">
              Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">MindScribe</span>,{' '}
              <span className="inline-block">
                {typedText}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-1 h-12 bg-purple-400 ml-1 align-middle"
                />
              </span>
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/register"
                className="inline-flex items-center bg-white hover:bg-gray-100 text-purple-900 px-6 py-2.5 rounded-lg font-sans font-semibold text-base transition-all shadow-lg"
              >
                Get Started
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Animated Wave Divider */}
      <div className="relative h-24 bg-white overflow-hidden">
        <motion.svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <motion.path
            initial={{ 
              d: "M0,60 C300,10 900,110 1200,40 L1200 120 L0 120 Z" 
            }}
            animate={{ 
              d: [
                "M0,60 C300,10 900,110 1200,40 L1200 120 L0 120 Z",
                "M0,40 C300,100 900,0 1200,60 L1200 120 L0 120 Z",
                "M0,60 C300,10 900,110 1200,40 L1200 120 L0 120 Z"
              ]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            fill="url(#waveGradient)"
          />
          <defs>
            <linearGradient id="waveGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </motion.svg>
      </div>

      {/*       to="/register"
                className="inline-flex items-center bg-white hover:bg-gray-100 text-purple-900 px-6 py-2.5 rounded-lg font-sans font-semibold text-base transition-all shadow-lg"
              >
                Get Started
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-br from-gray-50 to-purple-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-300 rounded-full opacity-10 blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <motion.span 
              className="inline-block text-purple-700 font-semibold mb-4 text-sm uppercase tracking-wider"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Powerful Features
            </motion.span>
            <h3 className="text-4xl md:text-4xl font-bold font-serif text-gray-900 mb-4  lg:text-5xl">
              Everything You Need for
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"> Modern Therapy</span>
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Streamline your practice and provide better care with our comprehensive suite of tools
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const FeatureCard = () => {
                const ref = useRef(null);
                const isInView = useInView(ref, { once: true, margin: "-100px" });
                const [rotateX, setRotateX] = useState(0);
                const [rotateY, setRotateY] = useState(0);
                const isFlipped = flippedCards.includes(feature.id);

                const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                  if (isFlipped) return;
                  const card = e.currentTarget;
                  const rect = card.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;
                  const rotateXValue = (y - centerY) / 10;
                  const rotateYValue = (centerX - x) / 10;
                  setRotateX(rotateXValue);
                  setRotateY(rotateYValue);
                };

                const handleMouseLeave = () => {
                  setRotateX(0);
                  setRotateY(0);
                };

                return (
                  <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 80 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group perspective-1000"
                    style={{ perspective: '1000px' }}
                  >
                    <motion.div
                      className="relative h-full cursor-pointer"
                      style={{
                        transformStyle: 'preserve-3d',
                      }}
                      animate={{
                        rotateX: isFlipped ? 0 : rotateX,
                        rotateY: isFlipped ? 180 : rotateY,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => toggleCardFlip(feature.id)}
                    >
                      {/* Front of Card */}
                      <div 
                        className="absolute inset-0 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
                        style={{ 
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(0deg)'
                        }}
                      >
                        {/* Image */}
                        <div className={`relative bg-gradient-to-br ${feature.color} aspect-video overflow-hidden`}>
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-purple-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                          />
                          <img
                            src={feature.imagePath}
                            alt={feature.imageAlt}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onLoad={(e) => {
                              const container = e.currentTarget.parentElement;
                              const placeholder = container?.querySelector('.placeholder-icon');
                              if (placeholder) {
                                placeholder.classList.add('hidden');
                              }
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="placeholder-icon absolute inset-0 flex items-center justify-center pointer-events-none">
                            <feature.icon className="text-white" size={60} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <motion.div 
                            className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl mb-4"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <feature.icon className="text-purple-700" size={24} />
                          </motion.div>

                          <h4 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-700 transition-colors">
                            {feature.title}
                          </h4>
                          <p className="text-gray-600 leading-relaxed mb-4">
                            {feature.description}
                          </p>
                          <motion.button
                            className="text-purple-700 font-semibold text-sm flex items-center gap-2 group/btn"
                            whileHover={{ x: 5 }}
                          >
                            Click to explore
                            <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                          </motion.button>
                        </div>
                      </div>

                      {/* Back of Card */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 rounded-2xl overflow-hidden shadow-2xl p-6 text-white"
                        style={{ 
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                      >
                        <div className="h-full flex flex-col">
                          <div className="flex items-center justify-between mb-4">
                            <motion.div 
                              className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl"
                              animate={{ rotate: [0, 360] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                              <feature.icon className="text-white" size={24} />
                            </motion.div>
                            <button 
                              className="text-white/80 hover:text-white text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCardFlip(feature.id);
                              }}
                            >
                              Back
                            </button>
                          </div>

                          <h4 className="text-2xl font-bold mb-4">
                            {feature.title}
                          </h4>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-start gap-3">
                              <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
                              <p className="text-sm">Reduces documentation time by up to 80%</p>
                            </div>
                            <div className="flex items-start gap-3">
                              <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
                              <p className="text-sm">AI-powered with 95%+ accuracy</p>
                            </div>
                            <div className="flex items-start gap-3">
                              <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
                              <p className="text-sm">Seamless integration with existing workflows</p>
                            </div>
                            <div className="flex items-start gap-3">
                              <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
                              <p className="text-sm">Real-time processing and instant results</p>
                            </div>
                          </div>

                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="mt-4"
                          >
                            <Link
                              to="/register"
                              className="block w-full bg-white text-purple-900 py-3 rounded-lg font-semibold text-center hover:bg-gray-100 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Try It Now
                            </Link>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              };

              return <FeatureCard key={feature.id} />;
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white relative overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" 
               style={{
                 backgroundImage: 'radial-gradient(circle, purple 1px, transparent 1px)',
                 backgroundSize: '50px 50px'
               }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Image Side */}
            <motion.div 
              className="flex-1 w-full"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.div 
                className="relative rounded-2xl overflow-hidden shadow-2xl aspect-square bg-gradient-to-br from-purple-300 to-purple-400"
                whileHover={{ rotate: 2, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <img
                  src="/images/therapist-about.jpg"
                  alt="Therapist using MindScribe"
                  className="w-full h-full object-cover"
                  onLoad={(e) => {
                    const container = e.currentTarget.parentElement;
                    const placeholder = container?.querySelector('.placeholder-icon');
                    if (placeholder) {
                      placeholder.classList.add('hidden');
                    }
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="placeholder-icon absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Sparkles className="text-white" size={100} />
                </div>

                {/* Floating stats cards */}
                <motion.div
                  className="absolute top-6 -right-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl"
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Star className="text-white" size={20} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">98%</div>
                      <div className="text-xs text-gray-600">Satisfaction</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute bottom-6 -left-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl"
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.1, rotate: -5 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Users className="text-white" size={20} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">5K+</div>
                      <div className="text-xs text-gray-600">Therapists</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Content Side */}
            <motion.div 
              className="flex-1 w-full"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.span 
                className="inline-block text-purple-700 font-semibold mb-4 text-sm uppercase tracking-wider"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                About MindScribe
              </motion.span>

              <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                What is <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">MindScribe?</span>
              </h3>

              <div className="space-y-4 text-lg text-gray-700 leading-relaxed mb-8">
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <strong className="text-purple-700">MindScribe</strong> is dedicated to empowering therapists with advanced AI-driven tools that transform the way mental health care is delivered.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  We understand the challenges therapists face with administrative tasks, documentation, and maintaining quality patient care. That's why we've built a comprehensive platform that automates time-consuming processes while providing deep insights into patient progress.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  Our mission is to give therapists more time to focus on what matters most—their patients. With cutting-edge AI technology, MindScribe handles the paperwork, so you can focus on healing.
                </motion.p>
              </div>

              {/* Benefits List */}
              <motion.div 
                className="space-y-3 mb-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ x: 10 }}
                  >
                    <CheckCircle2 className="text-green-500 flex-shrink-0" size={24} />
                    <span className="text-gray-700">{benefit}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/register"
                  className="inline-flex items-center bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-white px-8 py-4 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  Start Your Free Trial
                  <ArrowRight className="ml-2" size={18} />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 relative overflow-hidden">
        {/* Animated background */}
        <motion.div
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
            backgroundSize: '200% 200%'
          }}
        />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Trusted by Therapists Worldwide
            </h3>
            <p className="text-xl text-purple-200 max-w-2xl mx-auto">
              Join thousands of mental health professionals who are transforming their practice
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="relative"
              >
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
                  <motion.div
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.2
                    }}
                    className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4"
                  >
                    <stat.icon className="text-white" size={32} />
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
                    className="text-4xl md:text-5xl font-bold text-white mb-2"
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-purple-200 font-medium">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-purple-50 relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-purple-300 to-pink-300 rounded-full opacity-20 blur-3xl"
          />
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl shadow-2xl p-12 text-center border border-purple-100"
          >
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
              }}
              className="inline-block mb-6"
            >
              <Sparkles className="text-purple-700" size={48} />
            </motion.div>

            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Ready to Transform Your Practice?
            </h3>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of therapists who are saving time, improving patient care, and growing their practice with MindScribe.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-white px-10 py-5 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2" size={20} />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-purple-900 via-purple-950 to-indigo-900 text-white py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
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

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Sparkles size={28} />
              <span className="text-2xl font-bold">MindScribe</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex gap-8"
            >
              {['Features', 'About', 'Pricing', 'Contact'].map((item, index) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-purple-200 hover:text-white transition-colors"
                  whileHover={{ y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  {item}
                </motion.a>
              ))}
            </motion.div>

            <motion.p 
              className="text-purple-200"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              © 2026 MindScribe. Empowering therapists, transforming care.
            </motion.p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
