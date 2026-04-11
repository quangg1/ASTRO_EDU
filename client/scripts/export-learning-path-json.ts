import { writeFileSync } from 'fs'
import { join } from 'path'
import { LEARNING_MODULES } from '../src/data/learningPathCurriculum'

const out = join(__dirname, '..', '..', 'services', 'api', 'data', 'learningPathDefault.json')
writeFileSync(out, JSON.stringify({ modules: LEARNING_MODULES }, null, 2), 'utf8')
console.log('Wrote', out)
