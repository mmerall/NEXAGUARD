module nexaguard::nexaguard {

    use sui::tx_context;
    use sui::event;

    /// TOKEN analiz log'u için event
    public struct TokenScanEvent has copy, drop {
        target: address,           // token / package adresi
        scanner: address,          // çağrıyı yapan (backend cüzdanı)
        risk_level: u8,            // 0..3 (LOW/MEDIUM/HIGH/CRITICAL)
        unlimited_mint: bool,
        anyone_can_mint: bool,
        on_blocklist: bool,
        has_blacklist_fn: bool,
        can_pause_transfers: bool,
        owner_can_drain_liq: bool,
        upgradeable: bool,
    }

    /// WALLET analiz log'u için event
    public struct WalletScanEvent has copy, drop {
        wallet: address,
        scanner: address,
        risk_level: u8,            // 0..3
        interacts_with_blocklisted: bool,
        created_high_risk_tokens: bool,
        frequent_rug_like_activity: bool,
        many_new_wallet_transfers: bool,
        fresh_wallet_big_flows: bool,
        holds_high_risk_tokens: bool,
        interacts_with_mix_style_patterns: bool,
    }

    /// TOKEN için log yazan fonksiyon
    /// Not: 'public' tek başına yeterli, PTB'den çağrılabiliyor.
    public fun submit_token_report(
        target: address,
        risk_level: u8,
        unlimited_mint: bool,
        anyone_can_mint: bool,
        on_blocklist: bool,
        has_blacklist_fn: bool,
        can_pause_transfers: bool,
        owner_can_drain_liq: bool,
        upgradeable: bool,
        ctx: &mut tx_context::TxContext,
    ) {
        let scanner = tx_context::sender(ctx);
        let ev = TokenScanEvent {
            target,
            scanner,
            risk_level,
            unlimited_mint,
            anyone_can_mint,
            on_blocklist,
            has_blacklist_fn,
            can_pause_transfers,
            owner_can_drain_liq,
            upgradeable,
        };
        event::emit(ev);
    }

    /// WALLET için log yazan fonksiyon
    public fun submit_wallet_report(
        wallet: address,
        risk_level: u8,
        interacts_with_blocklisted: bool,
        created_high_risk_tokens: bool,
        frequent_rug_like_activity: bool,
        many_new_wallet_transfers: bool,
        fresh_wallet_big_flows: bool,
        holds_high_risk_tokens: bool,
        interacts_with_mix_style_patterns: bool,
        ctx: &mut tx_context::TxContext,
    ) {
        let scanner = tx_context::sender(ctx);
        let ev = WalletScanEvent {
            wallet,
            scanner,
            risk_level,
            interacts_with_blocklisted,
            created_high_risk_tokens,
            frequent_rug_like_activity,
            many_new_wallet_transfers,
            fresh_wallet_big_flows,
            holds_high_risk_tokens,
            interacts_with_mix_style_patterns,
        };
        event::emit(ev);
    }
}
