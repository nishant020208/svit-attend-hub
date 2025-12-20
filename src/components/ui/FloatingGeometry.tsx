import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface GeometryProps {
  position: [number, number, number];
  color: string;
  speed?: number;
  distort?: number;
  scale?: number;
  geometry?: 'sphere' | 'box' | 'torus' | 'octahedron' | 'dodecahedron';
}

function AnimatedGeometry({ position, color, speed = 1, distort = 0.3, scale = 1, geometry = 'sphere' }: GeometryProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 * speed;
    }
  });

  const renderGeometry = () => {
    switch (geometry) {
      case 'box':
        return <boxGeometry args={[1, 1, 1]} />;
      case 'torus':
        return <torusGeometry args={[0.6, 0.25, 16, 32]} />;
      case 'octahedron':
        return <octahedronGeometry args={[0.8]} />;
      case 'dodecahedron':
        return <dodecahedronGeometry args={[0.7]} />;
      default:
        return <sphereGeometry args={[0.7, 32, 32]} />;
    }
  };

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position} scale={scale}>
        {renderGeometry()}
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={distort}
          speed={speed * 2}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>
    </Float>
  );
}

function WobbleGeometry({ position, color, speed = 1, scale = 1 }: Omit<GeometryProps, 'distort' | 'geometry'>) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.1 * speed;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <icosahedronGeometry args={[0.8, 0]} />
        <MeshWobbleMaterial
          color={color}
          attach="material"
          factor={0.4}
          speed={speed}
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={0.6}
        />
      </mesh>
    </Float>
  );
}

function Particles() {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10;
      temp.push(x, y, z);
    }
    return new Float32Array(temp);
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#8b5cf6"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

interface FloatingGeometryProps {
  variant?: 'default' | 'minimal' | 'colorful' | 'dark';
  className?: string;
}

export function FloatingGeometry({ variant = 'default', className = '' }: FloatingGeometryProps) {
  const colorSchemes = {
    default: {
      primary: '#8b5cf6',
      secondary: '#3b82f6',
      accent: '#ec4899',
      tertiary: '#10b981',
    },
    minimal: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#a855f7',
      tertiary: '#c084fc',
    },
    colorful: {
      primary: '#f43f5e',
      secondary: '#8b5cf6',
      accent: '#06b6d4',
      tertiary: '#84cc16',
    },
    dark: {
      primary: '#4f46e5',
      secondary: '#7c3aed',
      accent: '#2563eb',
      tertiary: '#0891b2',
    },
  };

  const colors = colorSchemes[variant];

  return (
    <div className={`fixed inset-0 -z-10 pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#8b5cf6" />
        
        <AnimatedGeometry 
          position={[-4, 3, -2]} 
          color={colors.primary} 
          speed={0.5} 
          distort={0.4}
          scale={1.2}
          geometry="sphere"
        />
        <AnimatedGeometry 
          position={[4, -2, -3]} 
          color={colors.secondary} 
          speed={0.7} 
          distort={0.3}
          scale={0.9}
          geometry="box"
        />
        <AnimatedGeometry 
          position={[-3, -3, -1]} 
          color={colors.accent} 
          speed={0.4} 
          distort={0.5}
          scale={0.8}
          geometry="torus"
        />
        <AnimatedGeometry 
          position={[3, 2, -2]} 
          color={colors.tertiary} 
          speed={0.6} 
          distort={0.35}
          scale={1}
          geometry="octahedron"
        />
        <WobbleGeometry 
          position={[0, 4, -4]} 
          color={colors.primary} 
          speed={0.3}
          scale={0.7}
        />
        <WobbleGeometry 
          position={[-5, 0, -3]} 
          color={colors.secondary} 
          speed={0.5}
          scale={0.6}
        />
        <WobbleGeometry 
          position={[5, 0, -2]} 
          color={colors.accent} 
          speed={0.4}
          scale={0.65}
        />
        
        <Particles />
      </Canvas>
    </div>
  );
}

export default FloatingGeometry;
