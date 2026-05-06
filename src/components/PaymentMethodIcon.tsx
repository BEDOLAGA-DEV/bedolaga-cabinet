import { useId } from 'react';

interface PaymentMethodIconProps {
  method: string;
  className?: string;
}

export default function PaymentMethodIcon({
  method,
  className = 'h-8 w-8',
}: PaymentMethodIconProps) {
  const uid = useId();

  switch (method) {
    case 'telegram_stars':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#229ED9" />
          <path
            d="M20 8l3.09 6.26L30 15.27l-5 4.87 1.18 6.88L20 23.77l-6.18 3.25L15 20.14l-5-4.87 6.91-1.01L20 8z"
            fill="#FFD700"
          />
        </svg>
      );

    case 'cryptobot':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#0088CC" />
          <path
            d="M20 7c-7.18 0-13 5.82-13 13s5.82 13 13 13 13-5.82 13-13S27.18 7 20 7zm1.5 18.75v2.5h-3v-2.4c-2.1-.3-3.8-1.2-4.6-2.1l1.8-2.4c.9.8 2.1 1.5 3.3 1.5 1.1 0 1.8-.5 1.8-1.3 0-.9-.8-1.3-2.5-1.9-2.3-.8-4.2-1.9-4.2-4.4 0-2.1 1.5-3.7 4.2-4.1v-2.4h3v2.3c1.6.2 2.9.9 3.8 1.7l-1.7 2.3c-.7-.6-1.7-1.1-2.8-1.1-1 0-1.6.4-1.6 1.2 0 .8.8 1.2 2.6 1.9 2.5.9 4.1 2 4.1 4.4 0 2.2-1.6 3.9-4.2 4.2z"
            fill="#fff"
          />
        </svg>
      );

    case 'yookassa':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#0070F0" />
          <g fill="#fff">
            <rect x="11" y="11" width="4" height="18" rx="2" />
            <circle cx="23" cy="20" r="7" fill="none" stroke="#fff" strokeWidth="3.5" />
          </g>
        </svg>
      );

    case 'heleket':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#1A1A2E" />
          <path
            d="M20 8l2.47 5.01.55 1.12 1.23.18L30 15.27l-4 3.9-.89.87.21 1.22L26.18 27 20.9 24.22l-1.1-.58-1.1.58L13.62 27l.86-5.74.21-1.22-.89-.87-4-3.9 5.75-.96 1.23-.18.55-1.12L20 8z"
            fill="#00E68A"
          />
        </svg>
      );

    case 'mulenpay':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#FF4D4D" />
          <path
            d="M10 14h20c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2zm0 3v6h20v-6H10zm2 2h4v2h-4v-2z"
            fill="#fff"
            fillRule="evenodd"
          />
        </svg>
      );

    case 'pal24':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#00B341" />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="26" textAnchor="middle" fontSize="16">
              P24
            </text>
          </g>
        </svg>
      );

    case 'platega':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#6C5CE7" />
          <path
            d="M14 12h8c3.31 0 6 2.69 6 6s-2.69 6-6 6h-4v4h-4V12zm4 8h4c1.1 0 2-.9 2-2s-.9-2-2-2h-4v4z"
            fill="#fff"
          />
        </svg>
      );

    case 'wata':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#2D7FF9" />
          <path
            d="M20 10c-.55 0-1 .35-1.27.8L12 24c-.4.7.1 1.5.9 1.5h14.2c.8 0 1.3-.8.9-1.5l-6.73-13.2c-.27-.45-.72-.8-1.27-.8z"
            fill="#fff"
            opacity=".9"
          />
          <path
            d="M20 30c3.87 0 7-2.24 7-5 0-2.76-7-10-7-10s-7 7.24-7 10c0 2.76 3.13 5 7 5z"
            fill="#fff"
          />
        </svg>
      );

    case 'freekassa':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#FF6600" />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="26" textAnchor="middle" fontSize="16">
              FK
            </text>
          </g>
        </svg>
      );

    case 'freekassa_sbp':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#00B894" />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="20" textAnchor="middle" fontSize="9">
              СБП
            </text>
            <text x="20" y="30" textAnchor="middle" fontSize="8" fontWeight="400">
              QR
            </text>
          </g>
        </svg>
      );

    case 'freekassa_card':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#6C5CE7" />
          <rect
            x="10"
            y="14"
            width="20"
            height="14"
            rx="2"
            fill="none"
            stroke="#fff"
            strokeWidth="1.5"
          />
          <line x1="10" y1="19" x2="30" y2="19" stroke="#fff" strokeWidth="1.5" />
          <rect x="13" y="22" width="5" height="2" rx="0.5" fill="#fff" opacity=".6" />
        </svg>
      );

    case 'cloudpayments':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#004EBD" />
          <path
            d="M28.5 22c.83 0 1.5.67 1.5 1.5S29.33 25 28.5 25h-17c-1.93 0-3.5-1.57-3.5-3.5 0-1.72 1.24-3.15 2.88-3.45C11.15 15.17 13.86 13 17 13c2.48 0 4.65 1.3 5.89 3.25C23.56 15.48 24.7 15 26 15c2.76 0 5 2.24 5 5 0 .7-.15 1.37-.42 1.97-.02.01-.04.03-.08.03h-2z"
            fill="#fff"
          />
        </svg>
      );

    case 'tribute':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#7B61FF" />
          <path
            d="M20 10l2.94 5.96L29 17.02l-4.5 4.39L25.56 28 20 25.14 14.44 28l1.06-6.59L11 17.02l6.06-.96L20 10z"
            fill="#fff"
          />
        </svg>
      );

    case 'kassa_ai': {
      const kassaGradId = `${uid}-kassaAi`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={kassaGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${kassaGradId})`} />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="26" textAnchor="middle" fontSize="15">
              AI
            </text>
          </g>
        </svg>
      );
    }

    case 'riopay': {
      const riopayGradId = `${uid}-riopay`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={riopayGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${riopayGradId})`} />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="26" textAnchor="middle" fontSize="14">
              RP
            </text>
          </g>
        </svg>
      );
    }

    case 'severpay': {
      const severpayGradId = `${uid}-severpay`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={severpayGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${severpayGradId})`} />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="26" textAnchor="middle" fontSize="14">
              SP
            </text>
          </g>
        </svg>
      );
    }

    case 'paypear': {
      const paypearGradId = `${uid}-paypear`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={paypearGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${paypearGradId})`} />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="26" textAnchor="middle" fontSize="14">
              PP
            </text>
          </g>
        </svg>
      );
    }

    case 'rollypay': {
      const rollypayGradId = `${uid}-rollypay`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={rollypayGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${rollypayGradId})`} />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="26" textAnchor="middle" fontSize="14">
              RY
            </text>
          </g>
        </svg>
      );
    }

    case 'aurapay': {
      const aurapayGradId = `${uid}-aurapay`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={aurapayGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${aurapayGradId})`} />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="26" textAnchor="middle" fontSize="14">
              AP
            </text>
          </g>
        </svg>
      );
    }

    case 'etoplatezhi': {
      const etoplatezhiGradId = `${uid}-etoplatezhi`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={etoplatezhiGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${etoplatezhiGradId})`} />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="26" textAnchor="middle" fontSize="14">
              EP
            </text>
          </g>
        </svg>
      );
    }

    case 'antilopay': {
      const antilopayGradId = `${uid}-antilopay`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={antilopayGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${antilopayGradId})`} />
          <g fill="#fff" fontFamily="Arial,sans-serif" fontWeight="700">
            <text x="20" y="26" textAnchor="middle" fontSize="14">
              AL
            </text>
          </g>
        </svg>
      );
    }

    case 'jupiter': {
      const jupiterGradId = `${uid}-jupiter`;
      const jupiterRingId = `${uid}-jupiter-ring`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={jupiterGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="55%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient id={jupiterRingId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fde68a" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${jupiterGradId})`} />
          <ellipse
            cx="20"
            cy="22"
            rx="15"
            ry="3.4"
            fill="none"
            stroke={`url(#${jupiterRingId})`}
            strokeWidth="2"
            transform="rotate(-18 20 22)"
          />
          <circle cx="20" cy="20" r="6.5" fill="#fde68a" opacity="0.95" />
        </svg>
      );
    }

    case 'donut': {
      const donutBgGradId = `${uid}-donut-bg`;
      const donutGlazeGradId = `${uid}-donut-glaze`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={donutBgGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fdf2f8" />
              <stop offset="100%" stopColor="#fbcfe8" />
            </linearGradient>
            <radialGradient id={donutGlazeGradId} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="60%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#be185d" />
            </radialGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${donutBgGradId})`} />
          <circle cx="20" cy="20" r="13" fill={`url(#${donutGlazeGradId})`} />
          <circle cx="20" cy="20" r="4.5" fill="#fdf2f8" />
          <g fill="#fde68a">
            <rect
              x="13.5"
              y="11"
              width="2.5"
              height="1"
              rx="0.5"
              transform="rotate(-30 14.75 11.5)"
            />
            <rect x="22" y="13" width="2.5" height="1" rx="0.5" transform="rotate(20 23.25 13.5)" />
            <rect
              x="26"
              y="20"
              width="2.5"
              height="1"
              rx="0.5"
              transform="rotate(-15 27.25 20.5)"
            />
          </g>
          <g fill="#a7f3d0">
            <rect x="11" y="22" width="2.5" height="1" rx="0.5" transform="rotate(40 12.25 22.5)" />
            <rect
              x="20"
              y="26"
              width="2.5"
              height="1"
              rx="0.5"
              transform="rotate(-30 21.25 26.5)"
            />
          </g>
          <g fill="#bfdbfe">
            <rect x="16" y="27" width="2.5" height="1" rx="0.5" transform="rotate(15 17.25 27.5)" />
            <rect x="24" y="9" width="2.5" height="1" rx="0.5" transform="rotate(-25 25.25 9.5)" />
          </g>
        </svg>
      );
    }

    case 'lava': {
      const lavaBgGradId = `${uid}-lava-bg`;
      const lavaFlowGradId = `${uid}-lava-flow`;
      return (
        <svg className={className} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={lavaBgGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#0b0b0f" />
            </linearGradient>
            <linearGradient id={lavaFlowGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="35%" stopColor="#fb923c" />
              <stop offset="75%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill={`url(#${lavaBgGradId})`} />
          <path
            d="M7 27c2.2-1.6 4-3.5 5.4-5.7 1-1.6 1.6-3.4 2-5.2.4-1.7.7-3.5 1.7-4.9 1-1.4 2.6-2.3 4.3-2 1.6.3 2.8 1.6 3.4 3.1.6 1.5.8 3.2 1.6 4.7.9 1.7 2.5 3 4.3 3.6 1.5.5 3.1.5 4.6.6V33H7Z"
            fill={`url(#${lavaFlowGradId})`}
          />
          <circle cx="14" cy="14" r="1.6" fill="#fde047" opacity="0.85" />
          <circle cx="22" cy="10" r="1.1" fill="#fb923c" opacity="0.8" />
          <circle cx="29" cy="16" r="1.3" fill="#fde047" opacity="0.7" />
        </svg>
      );
    }

    case 'apple_iap':
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#000000" />
          <path
            d="M25.8 20.2c-.04-3.56 2.9-5.26 3.04-5.36-1.66-2.42-4.24-2.76-5.16-2.8-2.2-.22-4.28 1.3-5.4 1.3-1.12 0-2.84-1.26-4.68-1.22-2.4.04-4.62 1.4-5.86 3.56-2.5 4.34-.64 10.76 1.8 14.28 1.18 1.72 2.6 3.64 4.46 3.58 1.78-.08 2.46-1.16 4.62-1.16 2.16 0 2.78 1.16 4.68 1.12 1.92-.04 3.14-1.74 4.32-3.48 1.36-2 1.92-3.92 1.96-4.02-.04-.02-3.76-1.44-3.78-5.8zM22.24 10.2c.98-1.2 1.64-2.84 1.46-4.5-1.42.06-3.12.94-4.14 2.14-.9 1.06-1.7 2.74-1.48 4.36 1.58.12 3.18-.8 4.16-2z"
            fill="#fff"
          />
        </svg>
      );

    default:
      return (
        <svg className={className} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="20" fill="#4B5563" />
          <path
            d="M10 14h20c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2zm0 3v6h20v-6H10z"
            fill="#fff"
            opacity=".7"
          />
        </svg>
      );
  }
}
