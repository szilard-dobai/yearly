import { registerRoot } from 'remotion'
import { loadVideoFonts } from './fonts'
import { Root } from './Root'

loadVideoFonts()
registerRoot(Root)
