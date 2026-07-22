'use client';

// InteractiveRobotSpline — robot 3D Spline per la hero di /chi-siamo.
// Il runtime Spline pesa parecchio: lo si carica lazy DOPO l'idratazione
// (lazy + Suspense), così non blocca né il bundle dell'isola né il first
// paint. Due fasi di attesa distinte: (1) download del modulo runtime,
// (2) fetch+parse della scena — l'overlay di caricamento copre entrambe e
// sfuma solo all'onLoad della scena. Se qualcosa fallisce (runtime o scena),
// il boundary lascia lo spazio pulito: resta solo il glow decorativo del
// contenitore, nessun crash dell'isola.

import { Component, Suspense, lazy, useState } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

function Loader() {
  return (
    <div className="ap-robot-loading" aria-hidden="true">
      <span className="ap-robot-spinner"></span>
    </div>
  );
}

class RobotBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function InteractiveRobotSpline({ scene, label, hidden = [], cameraOffsetY = 0 }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // La scena arriva con fondale scuro "baked": lo si azzera qui (canvas
  // trasparente → il robot vive sull'aurora chiara della pagina) e si
  // nascondono gli oggetti scenografici non voluti (es. il pavimento scuro),
  // passati per nome via prop.
  const onLoad = (app) => {
    try {
      app.setBackgroundColor('transparent');
      for (const name of hidden) {
        const obj = app.findObjectByName(name);
        if (obj) obj.visible = false;
      }
      // Ricentra il soggetto nel riquadro spostando la camera (ortografica →
      // trasla l'inquadratura senza distorcere). Il watermark è screen-space,
      // ancorato al bordo basso del canvas: NON si muove — è l'unico modo per
      // alzare il robot sopra il clip del palco senza scoprire il watermark.
      if (cameraOffsetY) {
        const cam = app.findObjectByName('Camera');
        if (cam) cam.position.y += cameraOffsetY;
      }
      if (import.meta.env.DEV) window.__spline = app;
    } catch {
      /* estetica best-effort: la scena resta comunque visibile */
    }
    setReady(true);
  };

  return (
    <div
      className={`ap-robot${ready ? ' ap-robot--ready' : ''}`}
      role="img"
      aria-label={label}
    >
      <RobotBoundary>
        <Suspense fallback={null}>
          <Spline scene={scene} onLoad={onLoad} onError={() => setFailed(true)} />
        </Suspense>
      </RobotBoundary>
      {!ready && !failed && <Loader />}
    </div>
  );
}
