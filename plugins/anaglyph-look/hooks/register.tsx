import type { Register } from 'claude-code'

import { lookFor, SCENE, settingsFrom } from './scene'

// Anaglyph Look: a dark theme with a red and cyan 3D scene behind the chat, for red-cyan
// glasses. The settings shape the scene, which is built once when the mod loads.

export const register: Register = (on, options) => {
  const look = lookFor(settingsFrom(options))

  on('session.start', async ($, e, next) => {
    await $.theme.set(look.args)
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== $.plugin.name || e.props.scene !== SCENE) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={look.source} alt="A red and cyan 3D grid with wireframe shapes floating in and out of the screen" isInteractive />
  })
}
