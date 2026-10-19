# Reads one session transcript (raw lines, -R) and emits one compact summary.
def prompt_text:
  if type == "string" then .
  elif type == "array" then map(select(.type == "text") | .text) | join(" ")
  else "" end;

# The 5-minute slot a timestamp falls in, "YYYY-MM-DDTHH:MM", for hours worked.
def slot:
  .[0:14] + ((.[14:16] | tonumber / 5 | floor * 5) as $m | if $m < 10 then "0\($m)" else "\($m)" end);

reduce (inputs | fromjson? | select(type == "object")) as $r (
  {cwd: null, first: null, last: null, branches: {}, mentions: {}, hours: {}, slots: {}, prompts: 0,
   prompt: null, context: null, aiTitle: null, name: null, prNumber: null, prRepo: null, replies: {}};
  # Every reply's tokens, subagents' included, for its cost. A reply is written once per content
  # block, each with the same message id: the last one's usage stands for it.
  (if $r.type == "assistant" and ($r.message.usage | type) == "object" and ($r.message.id // "") != ""
   then ($r.message.usage) as $u | ($u.cache_creation.ephemeral_1h_input_tokens // 0) as $h
     | .replies[$r.message.id] = [
         "\($r.message.model)\(if $u.speed == "fast" then "/fast" else "" end)",
         ($u.input_tokens // 0), (($u.cache_creation_input_tokens // 0) - $h), $h,
         ($u.cache_read_input_tokens // 0), ($u.output_tokens // 0)]
   else . end)
  | if $r.type == "user" and ($r.isSidechain | not) then
    .cwd //= $r.cwd
    | .first //= $r.timestamp
    | .last = ($r.timestamp // .last)
    | (if $r.timestamp then .hours[$r.timestamp[0:13]] += 1 | .slots[$r.timestamp | slot] = 1 else . end)
    | (if ($r.gitBranch // "") != "" and $r.gitBranch != "HEAD"
       then .branches[$r.gitBranch] += 1 else . end)
    | ($r.message.content | prompt_text) as $t
    | if ($r.isMeta | not) and $t != "" and ($t | startswith("<") | not) then
        .prompts += 1
        | .prompt //= ($t | gsub("\\s+"; " ") | .[0:160])
        | reduce ($t | [(scan("\\bgithub\\.com/([\\w.-]+/[\\w.-]+)/issues/([0-9]+)") | "\(.[0])#\(.[1])"),
                         (scan("\\b([\\w.-]+/[\\w.-]+)#([0-9]+)\\b") | "\(.[0])#\(.[1])")] | unique[]) as $k
            (.; .mentions[$k] += 1)
      else . end
  elif $r.type == "assistant" and ($r.isSidechain | not) and $r.timestamp then
    .last = $r.timestamp | .hours[$r.timestamp[0:13]] += 1 | .slots[$r.timestamp | slot] = 1
    | ($r.message.usage // null) as $u
    | if $u then .context = (($u.input_tokens // 0) + ($u.cache_creation_input_tokens // 0)
                             + ($u.cache_read_input_tokens // 0)) else . end
  elif $r.type == "ai-title" then .aiTitle = $r.aiTitle
  elif $r.type == "agent-name" then .name = $r.agentName
  elif $r.type == "custom-title" then .name = $r.customTitle
  elif $r.type == "pr-link" then .prNumber = $r.prNumber | .prRepo = $r.prRepository
  else . end
)
# Tokens per model: [input, 5-minute cache writes, 1-hour cache writes, cache reads, output].
| .tokens = reduce .replies[] as $m ({}; .[$m[0]] = [range(5) as $i | (.[$m[0]][$i] // 0) + $m[$i + 1]])
| del(.replies)
