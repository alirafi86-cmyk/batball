
import React, { useState } from 'react';

interface ScorerAuthModalProps {
  requiredPin: string;
  title?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ScorerAuthModal: React.FC<ScorerAuthModalProps> = ({ requiredPin, title = "Authorized Scorer", onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === requiredPin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 1000);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#001a11]/90 backdrop-blur-xl p-4 animate-fadeIn">
      <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#a1cf65]"></div>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-50 text-[#004e35] rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <i className="fas fa-key text-xl"></i>
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">{title}</h2>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Enter PIN to proceed</p>
        </div>

        <div className={`flex justify-center space-x-4 mb-10 ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                pin.length > i 
                  ? 'bg-[#004e35] border-[#004e35] scale-125' 
                  : 'border-gray-200 bg-transparent'
              } ${error ? 'bg-red-500 border-red-500' : ''}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button 
              key={digit} 
              onClick={() => handleInput(digit)}
              className="h-16 rounded-2xl bg-gray-50 text-xl font-black text-[#004e35] hover:bg-emerald-50 transition active:scale-90 border border-gray-100"
            >
              {digit}
            </button>
          ))}
          <button onClick={onCancel} className="h-16 rounded-2xl text-[10px] font-black uppercase text-gray-400 tracking-widest">Cancel</button>
          <button 
            onClick={() => handleInput('0')}
            className="h-16 rounded-2xl bg-gray-50 text-xl font-black text-[#004e35] hover:bg-emerald-50 transition border border-gray-100"
          >
            0
          </button>
          <button 
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition flex items-center justify-center border border-gray-100"
          >
            <i className="fas fa-backspace"></i>
          </button>
        </div>

        {error && (
          <p className="text-center text-red-500 font-black text-[10px] uppercase tracking-widest mt-6 animate-bounce">
            Incorrect PIN. Try again.
          </p>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default ScorerAuthModal;
