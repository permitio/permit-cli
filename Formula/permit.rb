class Permit < Formula
  desc "Permit.io CLI tool for managing authorization policies"
  homepage "https://github.com/permitio/cli"
  url "https://github.com/permitio/cli/releases/download/v0.1.2/permit-macos"
  version "0.1.2"
  sha256 "YOUR_SHA256_HERE" # You'll need to replace this with actual hash

  def install
    bin.install "permit-macos" => "permit"
  end

  test do
    system "#{bin}/permit", "--version"
  end
end 