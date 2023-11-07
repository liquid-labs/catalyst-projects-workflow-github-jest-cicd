/* global beforeAll describe expect fail test */
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import yaml from 'js-yaml'

import { Reporter } from '@liquid-labs/catalyst-server'

import * as removeHandler from '../remove'

const testPkgPath = fsPath.join(__dirname, 'data', 'pkgC')

describe('PUT:/workflows/github/node-unit-test/remove', () => {
  const reporter = new Reporter({ silent : true })

  const mockReq = {
    accepts : () => 'application/json',
    get     : (header) => header === 'X-CWD' ? testPkgPath : undefined,
    vars    : {}
  }

  const mockRes = {
    type  : () => {},
    write : () => {},
    end   : () => {}
  }

  beforeAll(async() => {
    const handler = removeHandler.func({ reporter })
    await handler(mockReq, mockRes)
  })

  test('deletes the script', async() => {
    const scriptPath = fsPath.join(testPkgPath, '.github', 'workflows', 'unit-tests-node.yaml')
    expect(existsSync(scriptPath)).toBe(false)
  })

  test('updates .catalyst-data.yaml', async() => {
    const catalystDataPath = fsPath.join(testPkgPath, '.catalyst-data.yaml')
    const catalystData = yaml.load(await fs.readFile(catalystDataPath, { encoding : 'utf8' }))
    expect(catalystData.workflows?.github?.['node-unit-test']).toBe(undefined)
  })

  test("lack of a 'X-CWD' header results in an exception", async() => {
    const exceptReq = Object.assign({}, mockReq, { get : () => undefined })
    const handler = removeHandler.func({ reporter })
    try {
      await handler(exceptReq, mockRes)
      fail('failed to throw')
    }
    catch (e) {
      expect(e.message).toMatch(/X-CWD/)
    }
  })
})
