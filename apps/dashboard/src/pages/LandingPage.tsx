import { Link } from 'react-router-dom';
import { useState } from 'react';

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-white text-xl font-bold">Meta Chat</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-200 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-gray-200 hover:text-white transition">Pricing</a>
            <a href="#integration" className="text-gray-200 hover:text-white transition">Integration</a>
            <Link to="/login" className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 text-white rounded-full hover:shadow-lg transition">
              Get Started
            </Link>
          </div>
          
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-32 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Transform Your Business with{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              AI-Powered Chat
            </span>
          </h1>
          <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
            Deploy enterprise-grade conversational AI across all your channels. 
            Integrate with your existing tools and scale effortlessly.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="px-8 py-4 bg-gradient-to-r from-cyan-400 to-purple-500 text-white rounded-full text-lg font-semibold hover:shadow-2xl transition transform hover:scale-105">
              Start Free Trial
            </Link>
            <Link to="/login" className="px-8 py-4 bg-white/10 backdrop-blur text-white rounded-full text-lg font-semibold hover:bg-white/20 transition">
              View Demo
            </Link>
          </div>
          
          <div className="mt-12 flex items-center justify-center space-x-8 text-gray-300">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              14-day free trial
            </div>
          </div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-black/30 backdrop-blur">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-white mb-16">
            Powerful Features for Modern Teams
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🚀',
                title: 'Multi-Channel Support',
                description: 'Deploy across web, mobile, Slack, Teams, and more from a single platform.'
              },
              {
                icon: '🔐',
                title: 'Enterprise Security',
                description: 'SOC 2 compliant with end-to-end encryption and role-based access control.'
              },
              {
                icon: '📊',
                title: 'Advanced Analytics',
                description: 'Real-time insights into conversations, user behavior, and performance metrics.'
              },
              {
                icon: '🎨',
                title: 'Custom Branding',
                description: 'White-label solution with full customization of UI, colors, and branding.'
              },
              {
                icon: '🔄',
                title: 'Seamless Integration',
                description: 'Connect with your CRM, helpdesk, and existing tools via webhooks and API.'
              },
              {
                icon: '🤖',
                title: 'AI-Powered Responses',
                description: 'State-of-the-art NLP with continuous learning from your knowledge base.'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white/5 backdrop-blur rounded-2xl p-8 hover:bg-white/10 transition">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: '10M+', label: 'Messages Processed' },
              { number: '99.9%', label: 'Uptime SLA' },
              { number: '50ms', label: 'Average Response' },
              { number: '24/7', label: 'Support Available' }
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className="text-gray-300 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section id="integration" className="py-20 bg-black/30 backdrop-blur">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Integrates with Your Favorite Tools</h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Connect Meta Chat with your existing workflow and enhance productivity across your organization.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6">
            {['Slack', 'Microsoft Teams', 'Salesforce', 'HubSpot', 'Zendesk', 'Jira', 'Discord', 'WhatsApp'].map((tool) => (
              <div key={tool} className="bg-white/10 backdrop-blur px-6 py-3 rounded-full text-white hover:bg-white/20 transition">
                {tool}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-white mb-16">
            Simple, Transparent Pricing
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '9',
                features: ['Up to 5,000 messages/mo', '2 channels', 'Basic analytics', 'Email support']
              },
              {
                name: 'Professional',
                price: '99',
                popular: true,
                features: ['Up to 50,000 messages/mo', 'Unlimited channels', 'Advanced analytics', 'Priority support', 'Custom integrations']
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                features: ['Unlimited messages', 'White-label option', 'Dedicated account manager', 'SLA guarantee', 'On-premise deployment']
              }
            ].map((plan) => (
              <div key={plan.name} className={`relative bg-white/5 backdrop-blur rounded-2xl p-8 ${plan.popular ? 'ring-2 ring-purple-500' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-purple-500 text-white px-4 py-1 rounded-full text-sm">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-semibold text-white mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-white mb-6">
                  {plan.price}<span className="text-lg font-normal text-gray-300">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start text-gray-300">
                      <svg className="w-5 h-5 mr-2 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`block w-full py-3 rounded-full text-center font-semibold transition ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-white hover:shadow-lg' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-cyan-400 to-purple-500 rounded-3xl p-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your Customer Experience?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of companies using Meta Chat to deliver exceptional conversational experiences.
            </p>
            <Link to="/signup" className="inline-block px-8 py-4 bg-white text-purple-900 rounded-full text-lg font-semibold hover:shadow-xl transition transform hover:scale-105">
              Start Your Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">M</span>
              </div>
              <span className="text-white font-semibold">Meta Chat Platform</span>
            </div>
            <div className="flex space-x-6 text-gray-400">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
              <a href="#" className="hover:text-white transition">Contact</a>
            </div>
          </div>
          <div className="text-center text-gray-400 mt-8">
            © 2024 Meta Chat Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
