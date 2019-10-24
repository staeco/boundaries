package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"

	"github.com/tidwall/gjson"
)

var src = "./files/"
var dst = "/files"

var out = "./list.json"

// Result is a single geojson search result
type Result struct {
	Name string `json:"name"`
	ID   string `json:"id"`
	Tag  string `json:"tag"`
}

func main() {
	files, err := ioutil.ReadDir(src)
	if err != nil {
		panic(err)
	}
	var results []Result
	for _, f := range files {
		file, err := os.Open(fmt.Sprintf("%s/%s", src, f.Name()))
		if err != nil {
			log.Fatal(err)
		}
		defer file.Close()
		buf, _ := ioutil.ReadAll(file)
		str := string(buf)
		name := gjson.Get(str, "properties.name").String()
		id := gjson.Get(str, "properties.id").String()
		tag := gjson.Get(str, "properties.type").String()

		res := Result{
			Name: name,
			ID:   id,
			Tag:  tag,
		}
		results = append(results, res)
	}

	wr, _ := json.Marshal(results)
	_ = ioutil.WriteFile(out, wr, 0644)
}
