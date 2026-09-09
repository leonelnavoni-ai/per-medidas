import React from 'react';

interface PoliceLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'adapted' | 'original';
}

export const PoliceLogo: React.FC<PoliceLogoProps> = ({
  className = 'w-10 h-10',
  size,
  variant = 'adapted',
}) => {
  let style: React.CSSProperties | undefined = undefined;
  if (size) {
    if (typeof size === 'number') {
      style = { width: `${size}px`, height: `${size}px` };
    } else if (!isNaN(Number(size))) {
      style = { width: `${size}px`, height: `${size}px` };
    } else if (size === 'sm') {
      style = { width: '32px', height: '32px' };
    } else if (size === 'md') {
      style = { width: '48px', height: '48px' };
    } else if (size === 'lg') {
      style = { width: '72px', height: '72px' };
    } else if (size === 'xl') {
      style = { width: '96px', height: '96px' };
    } else if (size === '2xl') {
      style = { width: '128px', height: '128px' };
    } else {
      style = { width: size, height: size };
    }
  }

  // 16 Primary rays and 16 secondary intermediate rays for the authentic starburst
  const numPrimaryRays = 16;
  const numRays = 32;

  const rays = [];
  for (let i = 0; i < numRays; i++) {
    const angleDeg = (i * 360) / numRays;
    const angleRad = (angleDeg * Math.PI) / 180;
    const isPrimary = i % 2 === 0;
    const outerR = isPrimary ? 245 : 224;
    const baseR = 192;
    const halfWidthDeg = (360 / numRays) / 2;

    const leftAngleRad = ((angleDeg - halfWidthDeg) * Math.PI) / 180;
    const rightAngleRad = ((angleDeg + halfWidthDeg) * Math.PI) / 180;

    const cx = 250;
    const cy = 250;

    const tipX = cx + outerR * Math.cos(angleRad);
    const tipY = cy + outerR * Math.sin(angleRad);

    const leftX = cx + baseR * Math.cos(leftAngleRad);
    const leftY = cy + baseR * Math.sin(leftAngleRad);

    const rightX = cx + baseR * Math.cos(rightAngleRad);
    const rightY = cy + baseR * Math.sin(rightAngleRad);

    rays.push({
      key: i,
      leftFacet: `${cx},${cy} ${leftX},${leftY} ${tipX},${tipY}`,
      rightFacet: `${cx},${cy} ${tipX},${tipY} ${rightX},${rightY}`,
      isPrimary,
    });
  }

  const upperText =
    variant === 'adapted'
      ? 'COMISARÍA DE MINORIDAD Y VIOLENCIA FAMILIAR'
      : 'JEFATURA DE POLICÍA';

  const lowerText =
    variant === 'adapted'
      ? 'POLICÍA DE ENTRE RÍOS'
      : 'PROVINCIA DE ENTRE RÍOS';

  return (
    <svg
      viewBox="0 0 500 500"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Escudo Oficial Policía de Entre Ríos - Comisaría de Minoridad y Violencia Familiar"
    >
      <defs>
        {/* Radiance gold gradient light facet */}
        <linearGradient id="rayLightGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#FACC15" />
          <stop offset="80%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>

        {/* Radiance gold gradient shadow facet */}
        <linearGradient id="rayShadowGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CA8A04" />
          <stop offset="50%" stopColor="#A16207" />
          <stop offset="85%" stopColor="#854D0E" />
          <stop offset="100%" stopColor="#713F12" />
        </linearGradient>

        {/* Ring Gold Border Gradient */}
        <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="30%" stopColor="#EAB308" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Silver Knight Helmet & Leaf Gradients */}
        <linearGradient id="silverGloss" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#E2E8F0" />
          <stop offset="70%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Sky blue ribbon */}
        <linearGradient id="ribbonBlue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Red band of Artigas */}
        <linearGradient id="artigasRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="50%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>

        {/* Green quadrant (Sinople) */}
        <linearGradient id="greenField" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="50%" stopColor="#16A34A" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>

        {/* Subtle drop shadow */}
        <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.6" />
        </filter>

        {/* Circular text paths */}
        {/* Upper Arc Path (left to right over the top) */}
        <path
          id="upperArcPath"
          d={variant === 'adapted' ? "M 76 250 A 174 174 0 0 1 424 250" : "M 68 250 A 182 182 0 0 1 432 250"}
          fill="none"
        />

        {/* Lower Arc Path (left to right under the bottom) */}
        <path
          id="lowerArcPath"
          d="M 425 250 A 175 175 0 0 1 75 250"
          fill="none"
        />

        {/* Clip for the central shield */}
        <clipPath id="innerShieldClip">
          <path d="M 206 218 L 294 218 L 294 274 Q 294 316 250 332 Q 206 316 206 274 Z" />
        </clipPath>
      </defs>

      {/* --- 1. OUTER BLACK DISK BASE --- */}
      <circle cx="250" cy="250" r="248" fill="#0A0A0A" />

      {/* --- 2. MULTI-POINTED RADIANT FACETED SUNBURST (POLICÍA DE ENTRE RÍOS) --- */}
      <g filter="url(#badgeShadow)">
        {rays.map((ray) => (
          <g key={ray.key}>
            {/* Left facet (light) */}
            <polygon points={ray.leftFacet} fill="url(#rayLightGold)" />
            {/* Right facet (shadow) */}
            <polygon points={ray.rightFacet} fill="url(#rayShadowGold)" />
          </g>
        ))}
      </g>

      {/* --- 3. CONCENTRIC BLACK RING WITH GOLD BORDERS --- */}
      {/* Outer gold ring contour */}
      <circle cx="250" cy="250" r="195" fill="#0A0A0A" stroke="url(#ringGold)" strokeWidth="3" />
      <circle cx="250" cy="250" r="192" fill="none" stroke="#FEF08A" strokeWidth="1" opacity="0.6" />

      {/* Inner gold ring contour */}
      <circle cx="250" cy="250" r="150" fill="#0A0A0A" stroke="url(#ringGold)" strokeWidth="3" />
      <circle cx="250" cy="250" r="152" fill="none" stroke="#FEF08A" strokeWidth="1" opacity="0.6" />

      {/* --- 4. CIRCULAR TEXT IN GOLD LETTERS --- */}
      {/* Upper Text: COMISARÍA DE MINORIDAD Y VIOLENCIA FAMILIAR / JEFATURA DE POLICÍA */}
      <text
        fill="#FACC15"
        stroke="#78350F"
        strokeWidth="0.6"
        fontSize={variant === 'adapted' ? '11.2' : '20'}
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing={variant === 'adapted' ? '0.8' : '4'}
      >
        <textPath href="#upperArcPath" startOffset="50%" textAnchor="middle">
          {upperText}
        </textPath>
      </text>

      {/* Separator Dashes / Stars on the left and right */}
      <circle cx="65" cy="250" r="4" fill="#FACC15" stroke="#78350F" strokeWidth="1" />
      <circle cx="435" cy="250" r="4" fill="#FACC15" stroke="#78350F" strokeWidth="1" />

      {/* Lower Text: POLICÍA DE ENTRE RÍOS / PROVINCIA DE ENTRE RÍOS */}
      <text
        fill="#FACC15"
        stroke="#78350F"
        strokeWidth="0.6"
        fontSize={variant === 'adapted' ? '16' : '18'}
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="3"
      >
        <textPath href="#lowerArcPath" startOffset="50%" textAnchor="middle">
          {lowerText}
        </textPath>
      </text>

      {/* --- 5. INNER CORE (HERALDIC CENTER) --- */}
      {/* Deep blue/black inner field */}
      <circle cx="250" cy="250" r="148" fill="#090D16" />

      {/* Upper celestial ribbon: "POLICÍA PROVINCIA ENTRE RÍOS" */}
      <g filter="url(#badgeShadow)">
        {/* Ribbon arc body */}
        <path
          d="M 182 178 Q 250 162 318 178 L 314 189 Q 250 173 186 189 Z"
          fill="url(#ribbonBlue)"
          stroke="#FFFFFF"
          strokeWidth="1.2"
        />
        <text
          x="250"
          y="184"
          fill="#FFFFFF"
          stroke="#0F172A"
          strokeWidth="0.4"
          fontSize="6.8"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
          letterSpacing="0.8"
        >
          POLICÍA PROVINCIA ENTRE RÍOS
        </text>
      </g>

      {/* Knight Armor Helmet / Celada Heráldica de Plata */}
      <g id="knightHelmet" transform="translate(250, 204)" filter="url(#badgeShadow)">
        {/* Plume / Crest on top of helmet */}
        <path
          d="M -3 -15 Q 0 -22 6 -17 Q 0 -13 -3 -15 Z"
          fill="url(#silverGloss)"
        />
        {/* Helmet bowl (Cúpula del casco) */}
        <ellipse cx="0" cy="-6" rx="11" ry="9" fill="url(#silverGloss)" stroke="#334155" strokeWidth="0.8" />
        {/* Visor slit & grate */}
        <path
          d="M -9 -4 Q 0 -1 9 -4 L 8 2 Q 0 5 -8 2 Z"
          fill="#1E293B"
          stroke="#94A3B8"
          strokeWidth="0.6"
        />
        {/* Visor grille lines */}
        <line x1="-5" y1="-2" x2="-5" y2="1" stroke="#E2E8F0" strokeWidth="0.6" />
        <line x1="-2" y1="-1" x2="-2" y2="2" stroke="#E2E8F0" strokeWidth="0.6" />
        <line x1="1" y1="-1" x2="1" y2="2" stroke="#E2E8F0" strokeWidth="0.6" />
        <line x1="4" y1="-2" x2="4" y2="1" stroke="#E2E8F0" strokeWidth="0.6" />
        {/* Gorget (Cuello de armadura / babera) */}
        <path
          d="M -10 2 L -8 7 Q 0 10 8 7 L 10 2 Q 0 4 -10 2 Z"
          fill="url(#silverGloss)"
          stroke="#334155"
          strokeWidth="0.8"
        />
      </g>

      {/* Silver Oak / Laurel Leaves flanking the central shield */}
      <g stroke="url(#silverGloss)" fill="url(#silverGloss)" opacity="0.95">
        {/* Left branch */}
        <path d="M 198 225 Q 186 250 190 282 Q 196 308 212 324" fill="none" strokeWidth="2.5" />
        <ellipse cx="190" cy="235" rx="5" ry="3" transform="rotate(-30 190 235)" />
        <ellipse cx="184" cy="254" rx="6" ry="3.5" transform="rotate(-15 184 254)" />
        <ellipse cx="185" cy="275" rx="6" ry="3.5" transform="rotate(15 185 275)" />
        <ellipse cx="192" cy="296" rx="5.5" ry="3.5" transform="rotate(40 192 296)" />
        <ellipse cx="204" cy="314" rx="5" ry="3" transform="rotate(65 204 314)" />

        {/* Right branch */}
        <path d="M 302 225 Q 314 250 310 282 Q 304 308 288 324" fill="none" strokeWidth="2.5" />
        <ellipse cx="310" cy="235" rx="5" ry="3" transform="rotate(30 310 235)" />
        <ellipse cx="316" cy="254" rx="6" ry="3.5" transform="rotate(15 316 254)" />
        <ellipse cx="315" cy="275" rx="6" ry="3.5" transform="rotate(-15 315 275)" />
        <ellipse cx="308" cy="296" rx="5.5" ry="3.5" transform="rotate(-40 308 296)" />
        <ellipse cx="296" cy="314" rx="5" ry="3" transform="rotate(-65 296 314)" />
      </g>

      {/* --- 6. CENTRAL SHIELD OF POLICÍA DE ENTRE RÍOS --- */}
      <g filter="url(#badgeShadow)">
        {/* Shield Outer Gold Rim */}
        <path
          d="M 204 216 L 296 216 L 296 274 Q 296 318 250 335 Q 204 318 204 274 Z"
          fill="#0F172A"
          stroke="url(#ringGold)"
          strokeWidth="3"
        />

        {/* Shield Interior with Clip */}
        <g clipPath="url(#innerShieldClip)">
          {/* Base Entre Ríos flag background (Celeste and white) */}
          <rect x="200" y="210" width="100" height="42" fill="url(#ribbonBlue)" />
          <rect x="200" y="252" width="100" height="38" fill="#FFFFFF" />
          <rect x="200" y="290" width="100" height="50" fill="url(#ribbonBlue)" />

          {/* Upper Right Quadrant: Sinople (Green) field */}
          <rect x="250" y="210" width="55" height="58" fill="url(#greenField)" />

          {/* Sol de Mayo (May Sun) in the upper green quadrant */}
          <g transform="translate(274, 238)">
            {/* Sun Rays */}
            <circle cx="0" cy="0" r="6" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
            <path
              d="M 0 -11 L 2 -7 L 0 -6 L -2 -7 Z M 11 0 L 7 2 L 6 0 L 7 -2 Z M 0 11 L 2 7 L 0 6 L -2 7 Z M -11 0 L -7 2 L -6 0 L -7 -2 Z"
              fill="#FDE047"
            />
            <path
              d="M 7 -7 L 5 -3 L 4 -4 L 3 -5 Z M 7 7 L 3 5 L 4 4 L 5 3 Z M -7 7 L -5 3 L -4 4 L -3 5 Z M -7 -7 L -3 -5 L -4 -4 L -5 -3 Z"
              fill="#FDE047"
            />
            {/* Sun Face */}
            <circle cx="-1.5" cy="-1.5" r="0.6" fill="#78350F" />
            <circle cx="1.5" cy="-1.5" r="0.6" fill="#78350F" />
            <path d="M -1.8 1.5 Q 0 3 1.8 1.5" fill="none" stroke="#78350F" strokeWidth="0.6" />
          </g>

          {/* Red Diagonal Band of Artigas (Banda Punzó de Entre Ríos) */}
          <polygon
            points="200,214 224,214 300,314 276,314"
            fill="url(#artigasRed)"
            stroke="#991B1B"
            strokeWidth="0.8"
          />

          {/* Central Cartouche: Gold escutcheon with rooster (Vigilance) */}
          <g transform="translate(250, 264)">
            {/* Gold cartouche oval */}
            <ellipse
              cx="0"
              cy="0"
              rx="12"
              ry="14"
              fill="url(#ringGold)"
              stroke="#78350F"
              strokeWidth="1"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="9"
              ry="11"
              fill="#FEF08A"
              stroke="#CA8A04"
              strokeWidth="0.6"
            />

            {/* Heraldic Rooster (Gallo de la Vigilancia) */}
            {/* Comb (Cresta) */}
            <path d="M -1 -7 Q 1 -9 3 -7 Q 4 -9 5 -6" fill="#DC2626" />
            {/* Head & Beak */}
            <circle cx="2" cy="-5" r="2.5" fill="#B45309" />
            <polygon points="4,-5 7,-4.5 4,-3.5" fill="#EA580C" />
            {/* Body */}
            <ellipse cx="-1" cy="-1" rx="4.5" ry="4" fill="#B45309" />
            {/* Wing */}
            <path d="M -3 -2 Q 0 -4 2 -1 Q 0 2 -3 -2" fill="#D97706" />
            {/* Tail feathers */}
            <path
              d="M -4 -3 Q -9 -7 -6 -1 Q -8 3 -3 2"
              fill="none"
              stroke="#78350F"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Legs */}
            <line x1="-1" y1="3" x2="-2" y2="7" stroke="#78350F" strokeWidth="0.8" />
            <line x1="2" y1="3" x2="3" y2="7" stroke="#78350F" strokeWidth="0.8" />
          </g>
        </g>
      </g>

      {/* --- 7. LOWER CURVED RIBBON: "ESTADÍSTICAS" / CELESTE RIBBON --- */}
      <g filter="url(#badgeShadow)">
        <path
          d="M 194 330 Q 250 352 306 330 L 302 338 Q 250 360 198 338 Z"
          fill="url(#ribbonBlue)"
          stroke="#FFFFFF"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
};
