import { useEffect, useRef } from 'react';

export function ParticleTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      life: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 1; // Random size between 1 and 5
        this.speedX = Math.random() * 2 - 1; // Random speed X
        this.speedY = Math.random() * 2 - 1; // Random speed Y
        
        // Theme colors: Purple (Primary), Pink, and Emerald
        const colors = [
          '139, 92, 246', // Purple
          '236, 72, 153', // Pink
          '16, 185, 129'  // Emerald
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.life = 1.0;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02; // Fade out rate
        if (this.size > 0.1) this.size -= 0.05; // Shrink rate
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = `rgba(${this.color}, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Create fewer particles for better performance but enough for effect
      for (let i = 0; i < 2; i++) {
        particles.push(new Particle(e.clientX, e.clientY));
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        // Remove dead particles
        if (particles[i].life <= 0 || particles[i].size <= 0) {
          particles.splice(i, 1);
          i--;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="pointer-events-none fixed inset-0 z-50"
      style={{ mixBlendMode: 'screen' }} // Makes colors glow/blend nicely
    />
  );
}
