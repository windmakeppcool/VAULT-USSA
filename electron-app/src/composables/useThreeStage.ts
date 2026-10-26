import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface ThreeStage {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  controls: OrbitControls
  invalidate: () => void
  dispose: () => void
}

/**
 * three.js 渲染底座：负责 renderer / scene / camera / controls 的创建、
 * 尺寸自适应与按需渲染（dirty 标记）。
 *
 * 注意：内部使用 onMounted / onBeforeUnmount，必须在组件 setup() 中调用。
 * 返回值使用 getter，因为各对象在 onMounted 之后才真正创建。
 */
export function useThreeStage(hostRef: Ref<HTMLElement | null>, background = 0x131310): ThreeStage {
  let renderer!: WebGLRenderer
  let scene!: Scene
  let camera!: PerspectiveCamera
  let controls!: OrbitControls
  let raf = 0
  let dirty = true
  let resizeObserver: ResizeObserver | null = null

  const invalidate = () => {
    dirty = true
  }

  function render(): void {
    raf = requestAnimationFrame(render)
    if (!dirty) return
    dirty = false
    controls.update()
    renderer.render(scene, camera)
  }

  onMounted(() => {
    const host = hostRef.value
    if (!host) return

    renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    host.appendChild(renderer.domElement)

    scene = new Scene()
    scene.background = new Color(background)

    camera = new PerspectiveCamera(38, 1, 0.1, 20000)
    camera.position.set(320, -420, 280)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.12
    controls.addEventListener('change', invalidate)

    scene.add(new HemisphereLight(0xffffff, 0x555555, 1.8))
    const key = new DirectionalLight(0xffffff, 2.2)
    key.position.set(1, 1.4, 1.2)
    scene.add(key)
    const fill = new DirectionalLight(0xffffff, 0.8)
    fill.position.set(-1, -0.6, 0.4)
    scene.add(fill)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      invalidate()
    }
    resize()

    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)

    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      cancelAnimationFrame(raf)
    })

    render()
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    resizeObserver?.disconnect()
    controls?.dispose()
    renderer?.dispose()
    renderer?.domElement.remove()
  })

  return {
    get scene() { return scene },
    get camera() { return camera },
    get renderer() { return renderer },
    get controls() { return controls },
    invalidate,
    dispose() {
      cancelAnimationFrame(raf)
      renderer?.dispose()
    },
  }
}
