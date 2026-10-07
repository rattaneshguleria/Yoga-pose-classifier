import {
  useEffect,
  useState
} from 'react'

import {
  Camera,
  Check,
  Monitor,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun
} from 'lucide-react'

import { useSettings } from '../lib/settings.js'


function Row({
  icon: Icon,
  title,
  hint,
  children
}) {
  return (
    <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">

      <div className="flex items-start gap-3">

        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bone text-moss-dark">
          <Icon size={16} />
        </div>

        <div>

          <div className="font-medium">
            {title}
          </div>

          <div className="mt-1 max-w-lg text-sm leading-5 text-mute">
            {hint}
          </div>

        </div>

      </div>

      <div className="shrink-0">
        {children}
      </div>

    </div>
  )
}


function Toggle({
  on,
  set,
  label
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() =>
        set(!on)
      }
      className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${
        on
          ? 'bg-moss'
          : 'bg-line'
      }`}
    >

      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          on
            ? 'translate-x-5'
            : 'translate-x-0'
        }`}
      />

    </button>
  )
}


function StatusPill({
  children
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-moss-soft px-3 py-1.5 text-xs font-medium text-moss-dark">
      <Check size={12} />
      {children}
    </span>
  )
}


export default function Settings() {

  const [
    s,
    patch
  ] = useSettings()

  const [
    cams,
    setCams
  ] = useState([])


  useEffect(() => {

    navigator.mediaDevices
      ?.enumerateDevices()
      .then(
        devices =>
          setCams(
            devices.filter(
              x =>
                x.kind ===
                'videoinput'
            )
          )
      )
      .catch(
        () => {}
      )

  }, [])


  return (
    <div className="min-h-screen bg-bone">

      <div className="mx-auto max-w-4xl p-4 md:p-8">

        {/* Header */}

        <header>

          <div className="flex items-center gap-2 text-sm font-medium text-moss-dark">
            <Monitor size={15} />
            Preferences
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Settings.
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">
            Customize your camera, accessibility
            and analysis preferences. Changes are
            saved locally in your browser.
          </p>

        </header>


        {/* Camera */}

        <section className="mt-8 rounded-2xl border border-line bg-paper p-5 md:p-6">

          <div className="flex items-center gap-3">

            <div className="grid h-10 w-10 place-items-center rounded-xl bg-moss-soft text-moss-dark">
              <Camera size={18} />
            </div>

            <div>

              <h2 className="font-semibold">
                Camera
              </h2>

              <p className="mt-1 text-xs text-mute">
                Configure the camera used by Live Coach.
              </p>

            </div>

          </div>


          <div className="mt-4 divide-y divide-line border-y border-line">

            <Row
              icon={Camera}
              title="Camera device"
              hint="Device labels appear after you have allowed camera access once."
            >

              <select
                value={
                  s.cameraId
                }
                onChange={e =>
                  patch({
                    cameraId:
                      e.target
                        .value
                  })
                }
                className="w-full rounded-xl border border-line bg-bone px-3 py-2 text-sm outline-none focus:border-moss focus:ring-4 focus:ring-moss/10 sm:w-64"
              >

                <option value="">
                  Default camera
                </option>

                {cams.map(
                  (
                    c,
                    i
                  ) => (
                    <option
                      key={
                        c.deviceId
                      }
                      value={
                        c.deviceId
                      }
                    >
                      {c.label ||
                        `Camera ${
                          i + 1
                        }`}
                    </option>
                  )
                )}

              </select>

            </Row>


            <Row
              icon={RefreshCw}
              title="Mirror camera by default"
              hint="Shows the live camera feed like a mirror, which can feel more natural while practicing."
            >

              <Toggle
                on={
                  s.mirror
                }
                set={v =>
                  patch({
                    mirror:
                      v
                  })
                }
                label="Mirror camera by default"
              />

            </Row>

          </div>

        </section>


        {/* Accessibility */}

        <section className="mt-5 rounded-2xl border border-line bg-paper p-5 md:p-6">

          <div className="flex items-center gap-3">

            <div className="grid h-10 w-10 place-items-center rounded-xl bg-moss-soft text-moss-dark">
              <ShieldCheck size={18} />
            </div>

            <div>

              <h2 className="font-semibold">
                Accessibility & display
              </h2>

              <p className="mt-1 text-xs text-mute">
                Adjust the interface to match your preferences.
              </p>

            </div>

          </div>


          <div className="mt-4 divide-y divide-line border-y border-line">

            <Row
              icon={s.theme === 'dark' ? Moon : Sun}
              title="Appearance"
              hint="Choose a light or dark theme for the whole app."
            >

              <div className="inline-flex rounded-xl border border-line bg-bone p-1" role="group" aria-label="Color theme">
                {[
                  ['light', 'Light', Sun],
                  ['dark', 'Dark', Moon],
                ].map(([theme, label, Icon]) => (
                  <button
                    key={theme}
                    type="button"
                    aria-pressed={s.theme === theme}
                    onClick={() => patch({ theme })}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${s.theme === theme ? 'bg-paper text-ink shadow-sm' : 'text-mute hover:text-ink'}`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>

            </Row>

            <Row
              icon={Moon}
              title="Reduce motion"
              hint="Turns off page transitions and animated numbers."
            >

              <Toggle
                on={
                  s.reducedMotion
                }
                set={v =>
                  patch({
                    reducedMotion:
                      v
                  })
                }
                label="Reduce motion"
              />

            </Row>


            <Row
              icon={Sun}
              title="High contrast"
              hint="Uses stronger text and border contrast for easier reading."
            >

              <Toggle
                on={
                  s.highContrast
                }
                set={v =>
                  patch({
                    highContrast:
                      v
                  })
                }
                label="High contrast"
              />

            </Row>

          </div>

        </section>


        {/* Analysis */}

        <section className="mt-5 rounded-2xl border border-line bg-paper p-5 md:p-6">

          <div className="flex items-center gap-3">

            <div className="grid h-10 w-10 place-items-center rounded-xl bg-moss-soft text-moss-dark">
              <Monitor size={18} />
            </div>

            <div>

              <h2 className="font-semibold">
                Analysis
              </h2>

              <p className="mt-1 text-xs text-mute">
                Information about where pose detection runs.
              </p>

            </div>

          </div>


          <div className="mt-4 rounded-xl border border-moss/20 bg-moss-soft p-4">

            <div className="flex items-start gap-3">

              <div className="mt-0.5 text-moss-dark">
                <ShieldCheck size={17} />
              </div>

              <div>

                <div className="text-sm font-semibold text-moss-dark">
                  Browser-based analysis
                </div>

                <p className="mt-1 text-xs leading-5 text-ink/60">
                  Pose detection currently runs
                  in your browser. Your camera feed
                  is not stored by YogaVision.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* Current state */}

        <section className="mt-5 rounded-2xl border border-line bg-paper p-5 md:p-6">

          <h2 className="text-sm font-semibold">
            Current preferences
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">

            <StatusPill>
              Camera preference saved
            </StatusPill>

            {s.mirror && (
              <StatusPill>
                Mirror enabled
              </StatusPill>
            )}

            {s.reducedMotion && (
              <StatusPill>
                Reduced motion
              </StatusPill>
            )}

            {s.highContrast && (
              <StatusPill>
                High contrast
              </StatusPill>
            )}

            {!s.mirror &&
              !s.reducedMotion &&
              !s.highContrast && (
                <span className="text-xs text-mute">
                  Default display preferences
                </span>
              )}

          </div>

        </section>


        {/* Note */}

        <p className="mt-5 text-center text-xs text-mute">
          These preferences affect this browser only.
        </p>

      </div>

    </div>
  )
}
