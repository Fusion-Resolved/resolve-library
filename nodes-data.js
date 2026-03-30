/**
 * nodes-data.js — Single source of truth for all Fusion node definitions.
 * Node names are as they appear in DaVinci Resolve / Fusion.
 * Category (c) is the group label shown on each node chip/card.
 * Do not edit FUSION_NODES_ALL directly — add new nodes here and let
 * FUSION_NODES (deduplicated) be derived automatically.
 */

var FUSION_NODES_ALL = [
  // ── 3D ──────────────────────────────────────────────────────────────────
  { n: 'AlembicMesh3D',         c: '3D' },
  { n: 'Camera3D',              c: '3D' },
  { n: 'CubeMap',               c: '3D' },
  { n: 'Displace3D',            c: '3D' },
  { n: 'Duplicate3D',           c: '3D' },
  { n: 'FBXMesh3D',             c: '3D' },
  { n: 'ImagePlane3D',          c: '3D' },
  { n: 'Locator3D',             c: '3D' },
  { n: 'Merge3D',               c: '3D' },
  { n: 'OpenVDBMesh',           c: '3D' },
  { n: 'Particles3D',           c: '3D' },
  { n: 'PointCloud3D',          c: '3D' },
  { n: 'Projector3D',           c: '3D' },
  { n: 'Renderer3D',            c: '3D' },
  { n: 'Replace3D',             c: '3D' },
  { n: 'Shape3D',               c: '3D' },
  { n: 'SoftClip3D',            c: '3D' },
  { n: 'Text3D',                c: '3D' },
  { n: 'Transform3D',           c: '3D' },
  { n: 'Volume3D',              c: '3D' },
  { n: 'WarpTransform3D',       c: '3D' },

  // ── 3D Light ─────────────────────────────────────────────────────────────
  { n: 'AmbientLight',          c: '3D Light' },
  { n: 'DirectionalLight',      c: '3D Light' },
  { n: 'PointLight',            c: '3D Light' },
  { n: 'SpotLight',             c: '3D Light' },

  // ── 3D Material ──────────────────────────────────────────────────────────
  { n: 'Blinn',                 c: '3D Material' },
  { n: 'CookTorrance',          c: '3D Material' },
  { n: 'Phong',                 c: '3D Material' },
  { n: 'Reflect',               c: '3D Material' },
  { n: 'Ward',                  c: '3D Material' },

  // ── 3D Texture ───────────────────────────────────────────────────────────
  { n: 'BumpMap',               c: '3D Texture' },
  { n: 'Catcher',               c: '3D Texture' },
  { n: 'Falloff',               c: '3D Texture' },
  { n: 'FastNoiseTexture',      c: '3D Texture' },
  { n: 'Gradient3D',            c: '3D Texture' },
  { n: 'SphereMap',             c: '3D Texture' },
  { n: 'Texture2D',             c: '3D Texture' },
  { n: 'TextureTransform',      c: '3D Texture' },

  // ── Blur ─────────────────────────────────────────────────────────────────
  { n: 'BilateralBlur',         c: 'Blur' },
  { n: 'Blur',                  c: 'Blur' },
  { n: 'DefocusBlur',           c: 'Blur' },
  { n: 'Defocus',               c: 'Blur' },
  { n: 'DepthBlur',             c: 'Blur' },
  { n: 'GaussianBlur',          c: 'Blur' },
  { n: 'GlowBlur',              c: 'Blur' },
  { n: 'Glow',                  c: 'Blur' },
  { n: 'MotionBlur',            c: 'Blur' },
  { n: 'RackDefocus',           c: 'Blur' },
  { n: 'Sharpen',               c: 'Blur' },
  { n: 'SoftGlow',              c: 'Blur' },
  { n: 'UnsharpMask',           c: 'Blur' },
  { n: 'VariableBlur',          c: 'Blur' },
  { n: 'VectorMotionBlur',      c: 'Blur' },

  // ── Color ────────────────────────────────────────────────────────────────
  { n: 'AutoGain',              c: 'Color' },
  { n: 'BrightnessContrast',    c: 'Color' },
  { n: 'ChannelBooleans',       c: 'Color' },
  { n: 'ClipToColorRange',      c: 'Color' },
  { n: 'ColorCorrectorMask',    c: 'Color' },
  { n: 'ColorCorrector',        c: 'Color' },
  { n: 'ColorCurves',           c: 'Color' },
  { n: 'ColorGain',             c: 'Color' },
  { n: 'ColorGradient',         c: 'Color' },
  { n: 'ColorMatrix',           c: 'Color' },
  { n: 'ColorSpace',            c: 'Color' },
  { n: 'ColorSpaceTransform',   c: 'Color' },
  { n: 'Dither',                c: 'Color' },
  { n: 'ExposureCorrection',    c: 'Color' },
  { n: 'GammaCorrection',       c: 'Color' },
  { n: 'HueCorrectionMask',     c: 'Color' },
  { n: 'HueCorrector',          c: 'Color' },
  { n: 'HueSaturation',         c: 'Color' },
  { n: 'OCIOColorSpace',        c: 'Color' },
  { n: 'Posterize',             c: 'Color' },
  { n: 'RGBMixer',              c: 'Color' },
  { n: 'Tint',                  c: 'Color' },
  { n: 'ToneCorrector',         c: 'Color' },
  { n: 'WhiteBalance',          c: 'Color' },
  { n: 'WideGamutCorrector',    c: 'Color' },

  // ── Composite ────────────────────────────────────────────────────────────
  { n: 'AlphaMultiply',         c: 'Composite' },
  { n: 'BooleanOperator',       c: 'Composite' },
  { n: 'ChangeSizeAspect',      c: 'Composite' },
  { n: 'Cut',                   c: 'Composite' },
  { n: 'FieldMerge',            c: 'Composite' },
  { n: 'FieldSplit',            c: 'Composite' },
  { n: 'FrameAverage',          c: 'Composite' },
  { n: 'MergeStereoscopic',     c: 'Composite' },
  { n: 'Mux',                   c: 'Composite' },
  { n: 'Over',                  c: 'Composite' },
  { n: 'PictureInPicture',      c: 'Composite' },
  { n: 'StereoMix',             c: 'Composite' },
  { n: 'XFade',                 c: 'Composite' },

  // ── Creator ──────────────────────────────────────────────────────────────
  { n: 'Background',            c: 'Creator' },
  { n: 'FastNoise',             c: 'Creator' },
  { n: 'Gradient',              c: 'Creator' },
  { n: 'MandelbrotExplorer',    c: 'Creator' },
  { n: 'Plasma',                c: 'Creator' },
  { n: 'Text+',                 c: 'Creator' },
  { n: 'Tiles',                 c: 'Creator' },

  // ── Effect ───────────────────────────────────────────────────────────────
  { n: 'Emboss',                c: 'Effect' },
  { n: 'FilmEffect',            c: 'Effect' },
  { n: 'Grain',                 c: 'Effect' },
  { n: 'HalftonePattern',       c: 'Effect' },
  { n: 'HotSpot',               c: 'Effect' },
  { n: 'Kelvin',                c: 'Effect' },
  { n: 'LensFlare',             c: 'Effect' },
  { n: 'LensReflection',        c: 'Effect' },
  { n: 'PseudoColor',           c: 'Effect' },
  { n: 'ReliefEmboss',          c: 'Effect' },
  { n: 'SensorRemap',           c: 'Effect' },
  { n: 'Sobel',                 c: 'Effect' },
  { n: 'Vignette',              c: 'Effect' },

  // ── Filter ───────────────────────────────────────────────────────────────
  { n: 'Convolve',              c: 'Filter' },
  { n: 'DespillMadness',        c: 'Filter' },
  { n: 'ErodeDilate',           c: 'Filter' },
  { n: 'FilmGrain',             c: 'Filter' },
  { n: 'Highlight',             c: 'Filter' },
  { n: 'Median',                c: 'Filter' },
  { n: 'MinMaxBlur',            c: 'Filter' },
  { n: 'Noise',                 c: 'Filter' },
  { n: 'Offset',                c: 'Filter' },
  { n: 'ShadowBlur',            c: 'Filter' },
  { n: 'Smooth',                c: 'Filter' },
  { n: 'Texture',               c: 'Filter' },
  { n: 'Threshold',             c: 'Filter' },
  { n: 'Trails',                c: 'Filter' },
  { n: 'Unmult',                c: 'Filter' },

  // ── Flow ─────────────────────────────────────────────────────────────────
  { n: 'Note',                  c: 'Flow' },
  { n: 'PipeRouter',            c: 'Flow' },
  { n: 'Underlay',              c: 'Flow' },

  // ── I/O ──────────────────────────────────────────────────────────────────
  { n: 'ChangeDepth',           c: 'I/O' },
  { n: 'Loader',                c: 'I/O' },
  { n: 'MediaIn',               c: 'I/O' },
  { n: 'MediaOut',              c: 'I/O' },
  { n: 'Saver',                 c: 'I/O' },
  { n: 'uLoader',               c: 'I/O' },

  // ── Keyer ────────────────────────────────────────────────────────────────
  { n: 'ChromaKeyer',           c: 'Keyer' },
  { n: 'ChromaKeyerSE',         c: 'Keyer' },
  { n: 'CleanPlate',            c: 'Keyer' },
  { n: 'ColorKeyer',            c: 'Keyer' },
  { n: 'DeltaKeyer',            c: 'Keyer' },
  { n: 'DifferenceKeyer',       c: 'Keyer' },
  { n: 'GlareMask',             c: 'Keyer' },
  { n: 'LumaKeyer',             c: 'Keyer' },
  { n: 'MatteFinesser',         c: 'Keyer' },
  { n: 'PrimatteKeyer',         c: 'Keyer' },
  { n: 'UltraKeyer',            c: 'Keyer' },

  // ── Mask ─────────────────────────────────────────────────────────────────
  { n: 'BSplineMask',           c: 'Mask' },
  { n: 'BitmapMask',            c: 'Mask' },
  { n: 'ChannelBoolean',        c: 'Mask' },
  { n: 'EllipseMask',           c: 'Mask' },
  { n: 'GridWarpMask',          c: 'Mask' },
  { n: 'MaskSoftness',          c: 'Mask' },
  { n: 'Paint',                 c: 'Mask' },
  { n: 'PolylineMask',          c: 'Mask' },
  { n: 'RectangleMask',         c: 'Mask' },
  { n: 'RegionMask',            c: 'Mask' },
  { n: 'TriangleMask',          c: 'Mask' },
  { n: 'WandMask',              c: 'Mask' },

  // ── Matte ────────────────────────────────────────────────────────────────
  { n: 'Matte',                 c: 'Matte' },
  { n: 'MatteControl',          c: 'Matte' },
  { n: 'SpriteAtlas',           c: 'Matte' },
  { n: 'VariableFG',            c: 'Matte' },

  // ── Merge ────────────────────────────────────────────────────────────────
  { n: 'ColorComposite',        c: 'Merge' },
  { n: 'DepthMerge',            c: 'Merge' },
  { n: 'Dissolve',              c: 'Merge' },
  { n: 'Merge',                 c: 'Merge' },
  { n: 'MultiMerge',            c: 'Merge' },
  { n: 'pMerge',                c: 'Merge' },

  // ── Misc ─────────────────────────────────────────────────────────────────
  { n: 'Duplicate',             c: 'Misc' },
  { n: 'TimeCode',              c: 'Misc' },
  { n: 'TimeSpeed',             c: 'Misc' },
  { n: 'TimeStretcher',         c: 'Misc' },

  // ── Particle ─────────────────────────────────────────────────────────────
  { n: 'pArray',                c: 'Particle' },
  { n: 'pBounce',               c: 'Particle' },
  { n: 'pChangeColor',          c: 'Particle' },
  { n: 'pChangeStyle',          c: 'Particle' },
  { n: 'pCustom',               c: 'Particle' },
  { n: 'pDirectionalForce',     c: 'Particle' },
  { n: 'pDragForce',            c: 'Particle' },
  { n: 'pEmitter',              c: 'Particle' },
  { n: 'pFlock',                c: 'Particle' },
  { n: 'pFollow',               c: 'Particle' },
  { n: 'pFriction',             c: 'Particle' },
  { n: 'pGradientForce',        c: 'Particle' },
  { n: 'pGravity',              c: 'Particle' },
  { n: 'pImageEmitter',         c: 'Particle' },
  { n: 'pKill',                 c: 'Particle' },
  { n: 'pPointForce',           c: 'Particle' },
  { n: 'pRender',               c: 'Particle' },
  { n: 'pRotate',               c: 'Particle' },
  { n: 'pSpawn',                c: 'Particle' },
  { n: 'pTangentForce',         c: 'Particle' },
  { n: 'pTurbulence',           c: 'Particle' },
  { n: 'pVortex',               c: 'Particle' },

  // ── Stereo ───────────────────────────────────────────────────────────────
  { n: 'AnaglyphMerge',         c: 'Stereo' },
  { n: 'DisparityGenerator',    c: 'Stereo' },
  { n: 'StereoAlignTool',       c: 'Stereo' },

  // ── Tracking ─────────────────────────────────────────────────────────────
  { n: 'Stabilizer',            c: 'Tracking' },
  { n: 'Tracker',               c: 'Tracking' },

  // ── Transform ────────────────────────────────────────────────────────────
  { n: 'Crop',                  c: 'Transform' },
  { n: 'DVEDistort',            c: 'Transform' },
  { n: 'Flip',                  c: 'Transform' },
  { n: 'Letterbox',             c: 'Transform' },
  { n: 'Resize',                c: 'Transform' },
  { n: 'Scale',                 c: 'Transform' },
  { n: 'Transform',             c: 'Transform' },

  // ── Distort / Warp ───────────────────────────────────────────────────────
  { n: 'CornerPin',             c: 'Warp' },
  { n: 'Drip',                  c: 'Warp' },
  { n: 'DVE',                   c: 'Warp' },
  { n: 'GravityWarp',           c: 'Warp' },
  { n: 'GridWarp',              c: 'Warp' },
  { n: 'LensDistortion',        c: 'Warp' },
  { n: 'MagicLens',             c: 'Warp' },
  { n: 'Perspective',           c: 'Warp' },
  { n: 'PerspectivePositioner', c: 'Warp' },
  { n: 'Ripple',                c: 'Warp' },
  { n: 'SplineWarp',            c: 'Warp' },
  { n: 'Vortex',                c: 'Warp' },
  { n: 'WarpTransform',         c: 'Warp' },
  { n: 'WaveDistort',           c: 'Warp' },

  // ── Custom ───────────────────────────────────────────────────────────────
  { n: 'Custom',                c: 'Custom' },
  { n: 'CustomVertex',          c: 'Custom' },
  { n: 'SHADERFX',              c: 'Custom' },
];

// Deduplicated by name — first occurrence wins
var FUSION_NODES = (() => {
  const seen = new Set();
  return FUSION_NODES_ALL.filter(node => {
    if (seen.has(node.n)) return false;
    seen.add(node.n);
    return true;
  });
})();

// Flat Set of known node names (for "is this a known node?" checks)
var FUSION_NODES_KNOWN = new Set(FUSION_NODES.map(n => n.n));

// Unique node list (alias — same as FUSION_NODES, kept for compatibility)
var FUSION_NODES_UNIQUE = FUSION_NODES;
