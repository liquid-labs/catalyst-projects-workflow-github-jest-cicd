import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import createError from 'http-errors'

import { saveBuilderConfig } from '@liquid-labs/catalyst-lib-build'
import { determineOriginAndMain } from '@liquid-labs/git-toolkit'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { getPackageJSON } from '@liquid-labs/npm-toolkit'

const help = {
  name        : 'Add GitHub workflow Node unit test',
  summary     : 'Adds a GitHub CI/CD workflow for unit testing node projects.',
  description : ''
}

const method = 'put'
const path = ['workflows', 'github', 'node-unit-test', 'add']
const parameters = [
  {
    name       : 'nodeVersions',
    isMultiple : true,
    summary    : "A string representing a node version to test on. Versions are specified like '18.1.15', '18.1.x', or '18.x' where 'x' selects the latest in the series."
  },
  {
    name      : 'noPullRequest',
    isBoolean : true,
    summary   : 'Supresses testing on pull-requests targeting the main branch.'
  },
  {
    name      : 'noPush',
    isBoolean : true,
    summary   : 'Suppresses testing on push to the main branch.'
  },
  {
    name       : 'osList',
    isMultiple : true,
    summary    : "A string representing an OS type + version to test on. Defaults to: 'ubuntu-latest', 'macos-latest', 'windows-latest'."
  }
]

const defaultNodeVersions = ['18.x', '19.x', '20.x']
const defaultOsList = ['ubuntu-latest', 'windows-latest', 'macos-latest']

const func = ({ reporter }) => async(req, res) => {
  reporter.isolate()

  const {
    nodeVersions = defaultNodeVersions,
    noPullRequest = false,
    noPush = false,
    osList = defaultOsList
  } = req.vars

  if (noPush === true && noPullRequest === true) {
    throw createError.BadRequest('Cannot supress both pull-request and push triggers; must allow at least one.')
  }

  const cwd = req.get('X-CWD')
  if (cwd === undefined) {
    throw createError.BadRequest(`Called '${path.join(' ')}', but working dir 'X-CWD' header not found.`)
  }

  const packageJSON = await getPackageJSON({ pkgDir : __dirname })
  const { name: myName, version: myVersion } = packageJSON

  const [, mainBranch] = determineOriginAndMain({ projectPath : cwd, reporter })

  let contents = `name: Unit tests

on:\n`
  if (noPush !== true) {
    contents += `  push:
    branches: [ ${mainBranch} ]\n`
  }
  if (noPullRequest !== true) {
    contents += `  pull_request:
    branches: [ ${mainBranch} ]\n`
  }
  contents += `jobs:
  build_and_test:
    name: Build and test package on \${{ matrix.os }}/\${{ matrix.node-version }}

    runs-on: \${{ matrix.os }}

    strategy:
      matrix:
        node-version: [ ${nodeVersions.join(', ')} ]
        os: [ ${osList.join(', ')} ]

    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: \${{ matrix.node-version }}
      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
`

  const relWorkflowPath = fsPath.join('.github', 'workflows', 'unit-tests-node.yaml')
  const absWorkflowPath = fsPath.join(cwd, relWorkflowPath)

  await fs.mkdir(fsPath.dirname(absWorkflowPath), { recursive : true })
  await fs.writeFile(absWorkflowPath, contents)

  const data = {
    scripts : [
      {
        builder : myName,
        version : myVersion,
        path    : relWorkflowPath,
        purpose : 'Runs node unit test CI/CD using a GitHub Workflow.',
        config  : {
          ...req.vars
        }
      }
    ]
  }

  await saveBuilderConfig({ config : data, path, pkgRoot : cwd })

  const msg = 'Created 1 workflow.'

  httpSmartResponse({ msg, data, req, res })
}

export { help, func, method, parameters, path }
