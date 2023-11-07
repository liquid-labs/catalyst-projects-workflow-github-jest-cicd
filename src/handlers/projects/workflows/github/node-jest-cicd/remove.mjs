import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import createError from 'http-errors'

import { removeBuilderConfig } from '@liquid-labs/catalyst-lib-build'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'

const help = {
  name        : 'Remove GitHub workflow Node unit test',
  summary     : 'Removes the GitHub CI/CD workflow for unit testing node projects.',
  description : ''
}

const method = 'put'
const path = ['projects', 'workflows', 'github', 'node-jest-cicd', 'remove']
const parameters = []

const func = ({ app, reporter }) => async(req, res) => {
  reporter.isolate()

  const cwd = req.get('X-CWD')
  if (cwd === undefined) {
    throw createError.BadRequest(`Called '${path.join(' ')}', but working dir 'X-CWD' header not found.`)
  }

  const workflowPath = fsPath.join(cwd, '.github', 'workflows', 'unit-tests-node.yaml')

  try {
    await fs.rm(workflowPath)
    await removeBuilderConfig({ path, pkgRoot : cwd })
  }
  catch (e) {
    if (e.code !== 'ENOENT') {
      throw e
    }
  }

  const msg = `<code>${workflowPath}<rst> removed`

  httpSmartResponse({ msg, req, res })
}

export { help, func, method, parameters, path }
