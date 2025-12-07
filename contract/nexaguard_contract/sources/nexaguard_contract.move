module nexaguard_contract::nexaguard {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::string::String;

    /// Event emitted when a wallet analysis is submitted
    struct WalletAnalysisEvent has copy, drop {
        address: String,
        risk_score: u8,
        risk_level: String,
        timestamp: u64
    }

    /// Entry function to log analysis results on-chain
    /// calculated_risk: 0-100
    public entry fun submit_wallet_report(
        address: String,
        risk_score: u8,
        risk_level: String,
        _ctx: &mut TxContext
    ) {
        // Emit event for off-chain indexers to pick up
        event::emit(WalletAnalysisEvent {
            address,
            risk_score,
            risk_level,
            timestamp: tx_context::epoch_timestamp_ms(_ctx)
        });
    }
}
