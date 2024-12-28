;; HarvestDAO - A platform for farming cooperatives

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-member (err u101))
(define-constant err-already-member (err u102))
(define-constant err-invalid-proposal (err u103))
(define-constant err-proposal-expired (err u104))

;; Data Variables
(define-data-var proposal-count uint u0)

;; Data Maps
(define-map cooperatives 
    principal
    {
        name: (string-ascii 50),
        member-count: uint,
        resources: uint,
        created-at: uint
    }
)

(define-map members 
    {cooperative: principal, member: principal}
    {
        joined-at: uint,
        reputation: uint,
        shares: uint
    }
)

(define-map proposals
    uint 
    {
        cooperative: principal,
        proposer: principal,
        title: (string-ascii 100),
        description: (string-ascii 500),
        deadline: uint,
        yes-votes: uint,
        no-votes: uint,
        executed: bool
    }
)

;; Public Functions

;; Create a new cooperative
(define-public (create-cooperative (name (string-ascii 50)))
    (let
        ((cooperative-data {
            name: name,
            member-count: u1,
            resources: u0,
            created-at: block-height
        }))
        (begin
            (try! (map-set cooperatives tx-sender cooperative-data))
            (try! (map-set members {cooperative: tx-sender, member: tx-sender}
                {joined-at: block-height, reputation: u100, shares: u100}))
            (ok true)
        )
    )
)

;; Join existing cooperative
(define-public (join-cooperative (cooperative principal))
    (let
        ((coop (unwrap! (map-get? cooperatives cooperative) (err u404))))
        (if (map-get? members {cooperative: cooperative, member: tx-sender})
            err-already-member
            (begin
                (try! (map-set members 
                    {cooperative: cooperative, member: tx-sender}
                    {joined-at: block-height, reputation: u0, shares: u0}))
                (map-set cooperatives cooperative 
                    (merge coop {member-count: (+ (get member-count coop) u1)}))
                (ok true)
            )
        )
    )
)

;; Create proposal
(define-public (create-proposal 
    (cooperative principal)
    (title (string-ascii 100))
    (description (string-ascii 500))
    (deadline uint))
    (let
        ((member (unwrap! (map-get? members {cooperative: cooperative, member: tx-sender})
            err-not-member))
         (proposal-id (+ (var-get proposal-count) u1)))
        (begin
            (try! (map-set proposals proposal-id
                {
                    cooperative: cooperative,
                    proposer: tx-sender,
                    title: title,
                    description: description,
                    deadline: deadline,
                    yes-votes: u0,
                    no-votes: u0,
                    executed: false
                }))
            (var-set proposal-count proposal-id)
            (ok proposal-id)
        )
    )
)

;; Vote on proposal
(define-public (vote (proposal-id uint) (vote-bool bool))
    (let
        ((proposal (unwrap! (map-get? proposals proposal-id) err-invalid-proposal))
         (member (unwrap! (map-get? members 
            {cooperative: (get cooperative proposal), member: tx-sender})
            err-not-member)))
        (if (> block-height (get deadline proposal))
            err-proposal-expired
            (begin
                (map-set proposals proposal-id
                    (merge proposal
                        (if vote-bool
                            {yes-votes: (+ (get yes-votes proposal) u1)}
                            {no-votes: (+ (get no-votes proposal) u1)})))
                (ok true)
            )
        )
    )
)

;; Read-only functions

;; Get cooperative details
(define-read-only (get-cooperative (cooperative principal))
    (map-get? cooperatives cooperative)
)

;; Get member details
(define-read-only (get-member (cooperative principal) (member principal))
    (map-get? members {cooperative: cooperative, member: member})
)

;; Get proposal details
(define-read-only (get-proposal (proposal-id uint))
    (map-get? proposals proposal-id)
)