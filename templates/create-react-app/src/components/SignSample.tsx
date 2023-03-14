import { MsgSend, SyncTxBroadcastResult } from '@terra-money/feather.js';
import {
  CreateTxFailed,
  SignResult,
  Timeout,
  TxFailed,
  TxUnspecifiedError,
  useConnectedWallet,
  UserDenied,
  useLCDClient
} from '@terra-money/wallet-provider';
import React, { useCallback, useState, useMemo } from 'react';
import { useSelectedChain } from './ChainSelector';

const TEST_TO_ADDRESS = 'terra12hnhh5vtyg5juqnzm43970nh4fw42pt27nw9g9';

export function SignSample() {
  const [signResult, setSignResult] = useState<SignResult | null>(null);
  const [txResult, setTxResult] = useState<SyncTxBroadcastResult | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const chainID = useSelectedChain();
  const lcd = useLCDClient()

  const connectedWallet = useConnectedWallet();

  const baseAsset = useMemo(() => {
    if (!connectedWallet?.network) return '';
    // @ts-ignore
    return connectedWallet.network[chainID].baseAsset;
  }, [connectedWallet, chainID]);

  const explorerHref = useMemo(() => {
    if (!connectedWallet || !txResult) return '';
    // @ts-ignore-line
    const { explorer } = connectedWallet.network[chainID];   
    if (explorer.tx) return explorer.tx.replace("{}", txResult.txhash);
  }, [connectedWallet, chainID, txResult]);


  const send = useCallback(() => {
    if (!connectedWallet) {
      return;
    }
    const isMainnet = Object.keys(connectedWallet.network).some((key) => key.startsWith('phoenix-'));

    if (isMainnet) {
      alert(`Please only execute this example on Testnet`);
      return;
    }

    setSignResult(null);
    setTxResult(null);
    setTxError(null);

    connectedWallet
      .sign({
        chainID,
        msgs: [
          new MsgSend(connectedWallet.addresses[chainID], TEST_TO_ADDRESS, {
            [baseAsset]: 1000000,
          }),
        ],
      })
      .then((nextSignResult: SignResult) => {
        setSignResult(nextSignResult);

        // broadcast
        const tx = nextSignResult.result;
        return lcd.tx.broadcastSync(tx, chainID);
      })
      .then((nextTxResult: SyncTxBroadcastResult) => {
        setTxResult(nextTxResult);
      })
      .catch((error: unknown) => {
        if (error instanceof UserDenied) {
          setTxError('User Denied');
        } else if (error instanceof CreateTxFailed) {
          setTxError('Create Tx Failed: ' + error.message);
        } else if (error instanceof TxFailed) {
          setTxError('Tx Failed: ' + error.message);
        } else if (error instanceof Timeout) {
          setTxError('Timeout');
        } else if (error instanceof TxUnspecifiedError) {
          setTxError('Unspecified Error: ' + error.message);
        } else {
          setTxError(
            'Unknown Error: ' +
              (error instanceof Error ? error.message : String(error)),
          );
        }
      });
  }, [connectedWallet, chainID, lcd.tx, baseAsset]);

  return (
    <div>
      <h1>Sign Sample</h1>

      {connectedWallet?.availableSign &&
        !signResult &&
        !txResult &&
        !txError && (
          <button onClick={() => send()}>Send 1{baseAsset}to {TEST_TO_ADDRESS}</button>
        )}

      {signResult && <pre>{JSON.stringify(signResult, null, 2)}</pre>}

      {txResult && (
        <>
          <pre>{JSON.stringify(txResult, null, 2)}</pre>
          {explorerHref && (
            <a
              href={explorerHref}
              target="_blank"
              rel="noreferrer"
            >
              Open Tx Result in Terra Finder
            </a>
          )}
        </>
      )}

      {txError && <pre>{txError}</pre>}

      {(!!signResult || !!txResult || !!txError) && (
        <button
          onClick={() => {
            setSignResult(null);
            setTxResult(null);
            setTxError(null);
          }}
        >
          Clear result
        </button>
      )}

      {!connectedWallet && <p>Wallet not connected!</p>}

      {connectedWallet && !connectedWallet.availableSign && (
        <p>This connection does not support sign()</p>
      )}
    </div>
  );
}
