/* global beforeAll describe expect fail test */
import { existsSync } from 'node:fs'
import * as fsPath from 'node:path'

import { Reporter } from '@liquid-labs/catalyst-server'

import * as addHandler from '../add'

const testPkgPath = fsPath.join(__dirname, 'data', 'pkgA')

describe('PUT:/workflows/github/node-unit-test/add', () => {
  const reporter = new Reporter({ silent : true })
  let body

  const mockReq = {
    accepts : () => 'application/json',
    get     : (header) => header === 'X-CWD' ? testPkgPath : undefined,
    vars    : {}
  }

  const mockRes = {
    type  : () => {},
    write : (json) => { body = JSON.parse(json) },
    end   : () => {}
  }

  beforeAll(async() => {
    const handler = addHandler.func({ reporter })
    await handler(mockReq, mockRes)
  })

  test('returns data pointing to the script', () => {
    const { artifacts } = body
    expect(artifacts).toHaveLength(1)
    expect(artifacts[0].path).toBe('.github/workflows/unit-tests-node.yaml')
  })

  test('creates the script in the expected location', async() => {
    const scriptPath = fsPath.join(testPkgPath, '.github', 'workflows', 'unit-tests-node.yaml')
    expect(existsSync(scriptPath)).toBe(true)
  })

  test("saves '.catalyst-data.yaml'", () => {
    const catalystDataPath = fsPath.join(testPkgPath, '.catalyst-data.yaml')
    expect(existsSync(catalystDataPath)).toBe(true)
  })

  test("setting both 'noPush' and 'noPullRequest' results in an exception", async() => {
    const exceptReq = Object.assign({}, mockReq, { vars : { noPush : true, noPullRequest : true } })
    const handler = addHandler.func({ reporter })
    try {
      await handler(exceptReq, mockRes)
      fail('failed to throw')
    }
    catch (e) {
      expect(e.message).toMatch(/pull-request and push/)
    }
  })

  test("lack of a 'X-CWD' header results in an exception", async() => {
    const exceptReq = Object.assign({}, mockReq, { get : () => undefined })
    const handler = addHandler.func({ reporter })
    try {
      await handler(exceptReq, mockRes)
      fail('failed to throw')
    }
    catch (e) {
      expect(e.message).toMatch(/X-CWD/)
    }
  })
})
