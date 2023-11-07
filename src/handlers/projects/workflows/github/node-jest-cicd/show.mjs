import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import createError from 'http-errors'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'

const help = {
  name        : 'Show GitHub workflow Node unit test',
  summary     : 'Shows the GitHub CI/CD workflow for unit testing node projects.',
  description : ''
}

const method = 'put'
const path = ['projects', 'workflows', 'github', 'node-jest-cicd', 'show']
const parameters = []

const func = ({ app, reporter }) => async(req, res) => {
  reporter.isolate()

  const cwd = req.get('X-CWD')
  if (cwd === undefined) {
    throw createError.BadRequest(`Called '${path.join(' ')}', but working dir 'X-CWD' header not found.`)
  }

  const workflowPath = fsPath.join(cwd, '.github', 'workflows', 'unit-tests-node.yaml')

  try {
    const contents = await fs.readFile(workflowPath, { encoding : 'utf-8' })
    httpSmartResponse({ msg : contents, req, res })
  }
  catch (e) {
    if (e.code === 'ENOENT') {
      throw createError.NotFound(`<code>${workflowPath}<rst> does not exist`, { cause : e })
    }
    else {
      throw createError.InternalServerError(e)
    }
  }
}

export { help, func, method, parameters, path }
