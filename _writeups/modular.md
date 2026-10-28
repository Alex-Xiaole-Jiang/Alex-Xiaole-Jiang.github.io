---
# meta: JHEP 2026
---

<figure>
{% include fig-singularities.svg %}
<figcaption>A fun diagram from the paper; for the context, read on. Light travels along the diagonals, and the blue curves are hyperbolas. In these four configurations infinities appear in our calculation. Taming them lets us extract further results.</figcaption>
</figure>

While the name of this project seems technical and very specific (it is), we are actually studying entanglement (again), but in a slightly different context!
Let's start with the computation of entropy. Suppose you are handed a probability distribution $p$. We recognize that the entropy is defined as

$$
S = -\sum p \log p = \mathbb{E}(-\log p) = \langle-\log p\rangle,
$$

where the last two equality signs are just juggling notations, physicists like to use $\langle\,\cdot\,\rangle$ to denote expectation value. Here, the interesting object of study is $\log p$.

In quantum mechanics, the object that is similar to the classical probability distribution is the *density matrix* $\rho$, and similar to how the probability distribution sums to one, $\sum p = 1$, the density matrix (a positive semi-definite matrix) traces to one, $\operatorname{tr}\rho=1$. Similar to classical probability, we define the entropy quantum mechanically via

$$
S = \langle-\log \rho \rangle = -\operatorname{tr}(\rho \log\rho),
$$

and we call $H_\text{mod}=-\log\rho$ the modular Hamiltonian, we have $S = \langle H_\text{mod}\rangle$.

However, it turns out that the $S$ defined above can be rather boring, depending on whether the density matrix is boring, and for a pure state, which is a state that we know everything about, the density matrix is boring: it has rank one and zero entropy, just like a deterministic distribution (e.g. Kronecker delta).

What is interesting is entanglement, namely how much information about a subsystem $A$ we lose if we throw away the rest of the system, $B$. Throwing away $B$ is the partial trace $\operatorname{tr}_B$, the matrix version of marginalizing. The interesting quantity is therefore

$$
S_A = -\operatorname{tr}(\rho_A\log\rho_A),\quad\text{where}\quad \rho_A = \operatorname{tr}_B\rho.
$$

Perhaps surprisingly, while a deterministic joint distribution has deterministic marginals, a pure quantum state can have a mixed $\rho_A$, meaning $S_A$ can be nonzero even when $S=0$! We interpret $S_A$ as measuring exactly how entangled the two subsystems $A$ and $B$ are.

The object this paper is about is the modular Hamiltonian of a subsystem, $H_A = -\log\rho_A$. It carries everything about the entanglement, starting with $S_A = \langle H_A\rangle$. For a few special subsystems it is known exactly. We want to understand it more generally, so we reach into physicists' favorite toolbox --- perturbation theory.

The above quantum mechanical picture can be promoted to quantum field theory, if one is happy to let some infinities slip. The subsystems $A$ and $B$ are now regions of spacetime, and we are studying entanglement across these regions. In field theory, correlations between two points become singular when a light ray connects them. These light-cone singularities are how causality shows up in the calculation. The diagram at the top is the catalogue of where they occur. Taming those singularities lets us progress in understanding the modular Hamiltonian. For the rest, the paper has it all, check it out yourself!
