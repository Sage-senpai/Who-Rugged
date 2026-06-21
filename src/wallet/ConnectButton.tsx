import { Link } from 'react-router-dom'
import { useWallet } from './WalletContext'
import { displayName, getUsername } from './identity'
import { playerSprite } from '../lib/avatar'
import { loadPlayer } from '../game/profile'
import { getSkin } from '../cosmetics/skins'
import { sfx } from '../lib/sfx'

/* Compact wallet control for the HUD. Connect when off, link to the profile
   when on, with a dot that flags the wrong network. */
export function ConnectButton() {
  const { status, address, rightChain, connect } = useWallet()

  if (status === 'no-wallet') {
    return (
      <a className="wbtn" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
        ◇ No wallet
      </a>
    )
  }

  if (status === 'connected' && address) {
    return (
      <Link className="wbtn on" to="/profile" title={rightChain ? 'Profile' : 'Wrong network'}>
        <img className="wmug" alt="" src={playerSprite(address, getSkin(loadPlayer().elo))} />
        <span className={`wdot ${rightChain ? 'ok' : 'bad'}`} aria-hidden="true" />
        {displayName(address, getUsername(address))}
      </Link>
    )
  }

  return (
    <button
      className="wbtn"
      disabled={status === 'connecting'}
      onClick={() => {
        sfx.play('select')
        void connect()
      }}
    >
      {status === 'connecting' ? 'Linking…' : '◇ Connect'}
    </button>
  )
}
