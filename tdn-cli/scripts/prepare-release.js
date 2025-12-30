#!/usr/bin/env node

import fs from 'fs'
import { execSync } from 'child_process'
import readline from 'readline'

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    })
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`)
  }
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function prepareRelease() {
  const version = process.argv[2]

  if (!version || !version.match(/^(tdn-cli-)?v?\d+\.\d+\.\d+$/)) {
    console.error('Usage: node scripts/prepare-release.js 1.0.0')
    console.error('   or: bun run release:prepare 1.0.0')
    process.exit(1)
  }

  const cleanVersion = version.replace(/^(tdn-cli-)?v?/, '')
  const tagVersion = `tdn-cli-v${cleanVersion}`

  console.log(`Preparing release ${tagVersion}...\n`)

  try {
    // Check git status
    console.log('Checking git status...')
    const gitStatus = exec('git status --porcelain', { silent: true })
    if (gitStatus.trim()) {
      console.error(
        'Working directory is not clean. Please commit or stash changes first.'
      )
      console.log('Uncommitted changes:')
      console.log(gitStatus)
      process.exit(1)
    }
    console.log('Working directory is clean')

    // Run all checks first
    console.log('\nRunning pre-release checks...')
    exec('bun run check')
    console.log('All checks passed')

    // Update package.json
    console.log('\nUpdating package.json...')
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const oldPkgVersion = pkg.version
    pkg.version = cleanVersion
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
    console.log(`   ${oldPkgVersion} -> ${cleanVersion}`)

    // Update Cargo.toml
    console.log('Updating crates/core/Cargo.toml...')
    const cargoPath = 'crates/core/Cargo.toml'
    const cargoToml = fs.readFileSync(cargoPath, 'utf8')
    const oldCargoVersion = cargoToml.match(/version = "([^"]*)"/)
    const updatedCargo = cargoToml.replace(
      /version = "[^"]*"/,
      `version = "${cleanVersion}"`
    )
    fs.writeFileSync(cargoPath, updatedCargo)
    console.log(
      `   ${oldCargoVersion ? oldCargoVersion[1] : 'unknown'} -> ${cleanVersion}`
    )

    // Run bun install to update lock files
    console.log('\nUpdating lock files...')
    exec('bun install', { silent: true })
    console.log('Lock files updated')

    // Final check that Rust code compiles
    console.log('\nRunning final compilation check...')
    exec('cargo check --manifest-path crates/core/Cargo.toml')
    console.log('Rust compilation check passed')

    console.log(`\nSuccessfully prepared release ${tagVersion}!`)
    console.log('\nGit commands to execute:')
    console.log(`   git add .`)
    console.log(`   git commit -m "chore(cli): release ${tagVersion}"`)
    console.log(`   git tag ${tagVersion}`)
    console.log(`   git push && git push origin ${tagVersion}`)

    console.log('\nAfter pushing:')
    console.log('   - GitHub Actions will automatically build the release')
    console.log('   - Binaries for all platforms will be uploaded to GitHub Releases')
    console.log('   - Homebrew formula update will be triggered (if configured)')

    // Interactive execution option
    const answer = await askQuestion(
      '\nWould you like me to execute these git commands? (y/N): '
    )

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\nExecuting git commands...')

      console.log('Adding changes...')
      exec('git add .')

      console.log('Creating commit...')
      exec(`git commit -m "chore(cli): release ${tagVersion}"`)

      console.log('Creating tag...')
      exec(`git tag ${tagVersion}`)

      console.log('Pushing to remote...')
      exec('git push')
      exec(`git push origin ${tagVersion}`)

      console.log(`\nRelease ${tagVersion} has been published!`)
      console.log(
        'Check GitHub Actions: https://github.com/taskdn/taskdn/actions'
      )
      console.log(
        'Release will appear at: https://github.com/taskdn/taskdn/releases'
      )
    } else {
      console.log('\nGit commands saved for manual execution.')
      console.log("   Run them when you're ready to release.")
    }
  } catch (error) {
    console.error('\nPre-release preparation failed:', error.message)
    process.exit(1)
  }
}

prepareRelease()
